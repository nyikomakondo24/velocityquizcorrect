import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import WebSocket from 'ws';

const peers = new Set();
const metrics = { environment: 'Local production Node server; synthetic WebSocket clients, not 60 mobile browsers', players: 60 };
function percentile(values, fraction) { return [...values].sort((a,b) => a-b)[Math.ceil(values.length * fraction) - 1]; }
async function open(base) {
  const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws');
  const queue = [], waiting = [];
  const peer = { ws, bytes: 0, messages: [],
    send(message) { ws.send(JSON.stringify(message)); },
    next(predicate, timeout = 10000) {
      const index = queue.findIndex(predicate);
      if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve, timer: setTimeout(() => {
          waiting.splice(waiting.indexOf(waiter), 1);
          reject(new Error('Timed out waiting for server message. Received: ' + queue.map(m => m.type).join(', ')));
        }, timeout) };
        waiting.push(waiter);
      });
    },
  };
  ws.on('message', raw => {
    peer.bytes += raw.length;
    const message = JSON.parse(raw.toString()); peer.messages.push(message);
    const index = waiting.findIndex(waiter => waiter.predicate(message));
    if (index >= 0) { const [waiter] = waiting.splice(index, 1); clearTimeout(waiter.timer); waiter.resolve(message); }
    else queue.push(message);
  });
  peers.add(peer); await once(ws, 'open'); return peer;
}
function fixture() {
  return { id: 'load-quiz', title: '100-question payload fixture', category: 'Testing', description: '', createdAt: Date.now(),
    questions: Array.from({length:100}, (_,index) => ({
      id: 'q' + index, text: 'Load question ' + index, options: ['First', 'Second', 'Third', 'Fourth'], correctOptionIndex: index % 4,
      timeLimit: index === 1 ? 1 : 15, points: 1000, explanation: 'The answer key should only be visible after reveal.',
      imageUrl: 'data:image/png;base64,' + Buffer.alloc(1024, index).toString('base64'),
    })) };
}
const patch = status => message => message.type === 'ROOM_PATCH' && message.patch.status === status;

test('production server: sixty concurrent players and recovery', { timeout: 45000 }, async t => {
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT:'0', NODE_ENV:'production' }, stdio:['ignore','pipe','pipe'] });
  let logs = '';
  child.stderr.on('data', data => { logs += data; });
  t.after(async () => {
    for (const peer of peers) peer.ws.terminate();
    child.kill('SIGTERM');
    await once(child, 'exit');
  });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start: ' + logs)), 10000);
    child.stdout.on('data', data => {
      const match = String(data).match(/Listening on port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited (${code}): ${logs}`)); });
  });
  const base = 'http://127.0.0.1:' + port;
  let host = await open(base);
  const quiz = fixture();
  let created, players, code;
  await t.test('production HTML, caching, compression, missing assets, and health endpoint', async () => {
    assert.equal((await fetch(base)).status,200);
    const health = await (await fetch(base + '/api/health')).json(); assert.equal(health.status,'ok');
    assert.equal((await fetch(base + '/missing.js')).status,404);
    assert.equal((await fetch(base + '/api/missing')).status,404);
    const file = readdirSync('dist/assets').find(name => /^index-.*\.js$/.test(name));
    const asset = await fetch(base + '/assets/' + file, { headers: {'Accept-Encoding':'gzip'} });
    assert.match(asset.headers.get('cache-control'),/immutable/);
    assert.equal(asset.headers.get('content-encoding'),'gzip');
    metrics.entryJavaScriptBytes = readFileSync('dist/assets/' + file).length;
    metrics.entryJavaScriptGzipBytes = gzipSync(readFileSync('dist/assets/' + file)).length;
  });
  await t.test('malformed commands and invalid quizzes return errors without crashing', async () => {
    host.ws.send('{'); assert.equal((await host.next(m=>m.type==='ERROR')).type,'ERROR');
    host.send({type:'HOST_CREATE_ROOM',quiz:{...quiz, questions:[]}});
    assert.match((await host.next(m=>m.type==='ERROR')).message,/Invalid quiz/);
    host.send({type:'HOST_CREATE_ROOM', quiz});
    created = await host.next(m=>m.type==='ROOM_CREATED'); code = created.roomCode;
    assert.equal(created.session.role,'host');
  });
  await t.test('sixty simultaneous connections and joins; no future question or answer downloads', async () => {
    const started = performance.now();
    const times = [];
    players = await Promise.all(Array.from({length:60},async (_,index) => {
      const before = performance.now(); const peer = await open(base);
      peer.send({ type:'PLAYER_JOIN',roomCode:code,nickname:'Player '+index,avatar:'⚡' });
      peer.joined = await peer.next(m=>m.type==='JOIN_SUCCESS');
      times.push(performance.now()-before);
      assert.equal(peer.joined.room.quiz.questions.length,100);
      assert.ok(peer.joined.room.quiz.questions.every(q=>q.correctOptionIndex===-1 && !q.imageUrl && q.text===''));
      return peer;
    }));
    metrics.burstJoinTotalMs = Math.round(performance.now()-started);
    metrics.joinP95Ms = Math.round(percentile(times,0.95));
    const lobby = await host.next(m=>patch('LOBBY')(m) && Object.keys(m.patch.players).length===60);
    assert.equal(Object.keys(lobby.patch.players).length,60);
    const over = await open(base); over.send({type:'PLAYER_JOIN',roomCode:code,nickname:'Extra',avatar:'⚡'});
    assert.match((await over.next(m=>m.type==='JOIN_ERROR')).message,/full/);
  });
  await t.test('full-room refresh restores the same player and rejects unauthenticated commands', async () => {
    const old = players[0], replacement = await open(base);
    replacement.send({type:'SESSION_RESUME',roomCode:code,token:old.joined.session.token});
    const recovered = await replacement.next(m=>m.type==='SESSION_RESUMED');
    assert.equal(recovered.player.id,old.joined.player.id);
    assert.equal(Object.keys(recovered.room.players).length,60);
    assert.equal(recovered.player.connected,true);
    replacement.joined = { ...old.joined, player: recovered.player }; players[0]=replacement;
    replacement.send({type:'HOST_START_GAME',roomCode:code});
    assert.match((await replacement.next(m=>m.type==='ERROR')).message,/host/);
    const attacker = await open(base);
    attacker.send({type:'SESSION_RESUME',roomCode:code,token:'wrong'});
    assert.equal((await attacker.next(m=>m.type==='SESSION_EXPIRED')).type,'SESSION_EXPIRED');
  });
  await t.test('question updates are small and contain neither the quiz nor the answer key', async () => {
    host.send({type:'HOST_START_GAME',roomCode:code});
    const starts = await Promise.all(players.map(peer=>peer.next(patch('QUESTION'))));
    assert.ok(starts.every(message=>message.question.correctOptionIndex===-1 && !message.question.explanation));
    assert.ok(starts.every(message=>!message.patch.quiz));
    assert.ok(starts.every(message=>Object.values(message.patch.players).every(p=>!p.answerHistory && !p.lastAnswer)));
    metrics.playerQuestionPacketBytes = Buffer.byteLength(JSON.stringify(starts[0]));
    metrics.originalEquivalentFullRoomPacketBytes = Buffer.byteLength(JSON.stringify({type:'ROOM_UPDATED',room:{...created.room,players:starts[0].patch.players}}));
  });
  await t.test('another player’s ID, invalid choices and stale question submissions are rejected', async () => {
    const peer=players[0];
    const answer={type:'PLAYER_SUBMIT_ANSWER',roomCode:code,playerId:players[1].joined.player.id,questionId:'q0',optionIndex:0,clientTimestamp:Date.now()};
    peer.send(answer); assert.match((await peer.next(m=>m.type==='ERROR')).message,/own answer/);
    peer.send({...answer,playerId:peer.joined.player.id,optionIndex:99});
    assert.match((await peer.next(m=>m.type==='ERROR')).message,/Invalid answer/);
    peer.send({...answer,playerId:peer.joined.player.id,questionId:'q99'});
    assert.equal((await peer.next(m=>m.type==='ANSWER_REJECTED')).questionId,'q99');
  });
  await t.test('sixty simultaneous answers are acknowledged and coalesced into small broadcasts', async () => {
    const before=players.reduce((sum,p)=>sum+p.bytes,0), hostBefore=host.messages.length;
    const latencies=await Promise.all(players.map(async peer=> {
      const started=performance.now();
      peer.send({type:'PLAYER_SUBMIT_ANSWER',roomCode:code,playerId:peer.joined.player.id,questionId:'q0',optionIndex:0,clientTimestamp:Date.now()});
      peer.accepted=await peer.next(m=>m.type==='ANSWER_ACCEPTED');
      assert.equal(peer.accepted.player.answerHistory.length,1);
      assert.ok(peer.accepted.player.score>0); return performance.now()-started;
    }));
    await host.next(m=>patch('QUESTION')(m) && Object.keys(m.patch.answers).length===60);
    await Promise.all(players.map(peer=>peer.next(m=>patch('QUESTION')(m) && Object.keys(m.patch.answers).length===60)));
    metrics.answerAckP95Ms=Math.round(percentile(latencies,0.95));
    metrics.playerBytesForAnswerBurst=players.reduce((sum,p)=>sum+p.bytes,0)-before;
    metrics.hostUpdatesForAnswerBurst=host.messages.slice(hostBefore).filter(m=>m.type==='ROOM_PATCH').length;
    assert.ok(metrics.answerAckP95Ms<2000, 'Local acknowledgement should complete within two seconds');
    assert.ok(metrics.hostUpdatesForAnswerBurst<=3, 'Burst should not cause sixty full-room broadcasts');
  });
  await t.test('answer retries do not double-score and host refresh restores authority', async () => {
    const peer=players[0];
    peer.send({type:'PLAYER_SUBMIT_ANSWER',roomCode:code,playerId:peer.joined.player.id,questionId:'q0',optionIndex:0,clientTimestamp:Date.now()});
    const retry=await peer.next(m=>m.type==='ANSWER_ACCEPTED');
    assert.equal(retry.player.score,peer.accepted.player.score); assert.equal(retry.player.answerHistory.length,1);
    host.ws.terminate(); host=await open(base);
    host.send({type:'SESSION_RESUME',roomCode:code,token:created.session.token});
    const recovered=await host.next(m=>m.type==='SESSION_RESUMED');
    assert.equal(recovered.session.role,'host'); assert.equal(recovered.room.quiz.questions[99].correctOptionIndex,3);
    await players[0].next(patch('REVEAL'));
  });
  await t.test('deadline and missed-answer streak reset work with the host disconnected', async () => {
    host.send({type:'HOST_SHOW_LEADERBOARD',roomCode:code}); await host.next(patch('LEADERBOARD'));
    host.send({type:'HOST_NEXT_QUESTION',roomCode:code});
    await players[0].next(m=>patch('QUESTION')(m) && m.patch.currentQuestionIndex===1);
    host.ws.terminate();
    const revealed=await players[0].next(m=>patch('REVEAL')(m) && m.patch.currentQuestionIndex===1);
    assert.equal(revealed.question.correctOptionIndex,1); assert.equal(revealed.patch.players[players[0].joined.player.id].streak,0);
    host=await open(base); host.send({type:'SESSION_RESUME',roomCode:code,token:created.session.token});
    const resumed=await host.next(m=>m.type==='SESSION_RESUMED'); assert.equal(resumed.room.status,'REVEAL');
  });
  await t.test('podium histories and averages survive recovery; restarting resets all scores and answers', async () => {
    host.send({type:'HOST_SHOW_PODIUM',roomCode:code});
    const podium=await players[0].next(patch('PODIUM')); assert.equal(podium.patch.roomAverages.avgAccuracy,100);
    const peer=players[0]; peer.ws.terminate(); const recovered=await open(base);
    recovered.send({type:'SESSION_RESUME',roomCode:code,token:peer.joined.session.token});
    const state=await recovered.next(m=>m.type==='SESSION_RESUMED'); assert.equal(state.player.answerHistory.length,1);
    assert.ok(state.player.rank >= 1 && state.player.rank <= 60);
    recovered.joined=peer.joined; players[0]=recovered;
    host.send({type:'HOST_RESTART_GAME',roomCode:code});
    const reset=await host.next(m=>patch('LOBBY')(m) && m.patch.currentQuestionIndex===-1);
    assert.ok(Object.values(reset.patch.players).every(p=>p.score===0 && p.answersCount===0));
    const self=await recovered.next(m=>m.type==='SELF_UPDATED' && m.player.score===0);
    assert.equal(self.player.answerHistory.length,0); assert.equal(self.player.lastAnswer,undefined);
  });
  await t.test('kicking invalidates the session; leaving frees a slot and closing the room cleans up', async () => {
    host.send({type:'HOST_KICK_PLAYER',roomCode:code,playerId:players[0].joined.player.id});
    await players[0].next(m=>m.type==='KICKED');
    const peer=await open(base); peer.send({type:'SESSION_RESUME',roomCode:code,token:players[0].joined.session.token});
    await peer.next(m=>m.type==='SESSION_EXPIRED');
    peer.send({type:'PLAYER_JOIN',roomCode:code,nickname:'Replacement',avatar:'⚡'}); await peer.next(m=>m.type==='JOIN_SUCCESS');
    peer.send({type:'LEAVE_ROOM'}); await peer.next(m=>m.type==='KICKED');
    host.send({type:'LEAVE_ROOM'}); await host.next(m=>m.type==='KICKED');
    assert.equal((await (await fetch(base+'/api/health')).json()).activeRooms,0);
  });
  assert.equal(logs,'', 'No server runtime errors');
  if (process.env.REPORT_PATH) writeFileSync(process.env.REPORT_PATH,JSON.stringify(metrics,null,2)+'\n');
  console.log('Measured local results:',JSON.stringify(metrics));
});
