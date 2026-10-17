import express from 'express';
import compression from 'compression';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type { GameRoom, Player, Quiz, Question, ClientMessage, ServerMessage, Session } from './src/types/quiz.js';
import { calculateSpeedPoints } from './src/utils/scoring.js';
import { BOT_NAMES, FUN_AVATARS } from './src/data/defaultQuizzes.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(compression());
const server = http.createServer(app);
// Keep game connections separate from Vite's development connection.
const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024, perMessageDeflate: false });
server.on('upgrade', (request, socket, head) => {
  if (new URL(request.url || '/', 'http://localhost').pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request));
  } else if (!process.argv.includes('--dev')) socket.destroy();
});
const rooms = new Map<string, LiveRoom>();
const clients = new Map<WebSocket, ClientMeta>();
const ROOM_IDLE_MS = 2 * 60 * 60 * 1000;
const LOBBY_RECONNECT_MS = 2 * 60 * 1000;
const HOST_RECONNECT_MS = 10 * 60 * 1000;
interface SavedSession extends Session { socket?: WebSocket; disconnectedAt?: number }
interface LiveRoom {
  state: GameRoom;
  sockets: Set<WebSocket>;
  sessions: Map<string, SavedSession>;
  touchedAt: number;
  hostDisconnectedAt?: number;
  phaseKey?: string;
  flush?: NodeJS.Timeout;
  deadline?: NodeJS.Timeout;
  advance?: NodeJS.Timeout;
  botTimers: NodeJS.Timeout[];
}
interface ClientMeta {
  live?: LiveRoom;
  session?: SavedSession;
  alive: boolean;
  windowStart: number;
  messageCount: number;
}
function send(ws: WebSocket, message: ServerMessage) { sendEncoded(ws, JSON.stringify(message)); }
function sendEncoded(ws: WebSocket, packet: string) {
  if (ws.readyState !== WebSocket.OPEN) return;
  // Bound queues for slow phones; reconnect will obtain a fresh snapshot.
  if (ws.bufferedAmount > (clients.get(ws)?.session?.role === 'host' ? 12 : 2) * 1024 * 1024) { ws.close(1013, 'Slow connection. Please reconnect.'); return; }
  ws.send(packet, error => { if (error) ws.terminate(); });
}
function summary(player: Player): Player {
  const { answerHistory, lastAnswer, ...publicPlayer } = player;
  return publicPlayer;
}
function publicQuestion(question: Question, reveal: boolean): Question {
  if (reveal) return question;
  const { correctOptionIndex, explanation, ...safe } = question;
  return { ...safe, correctOptionIndex: -1 };
}
function safeAnswers(room: GameRoom, isHost: boolean) {
  if (isHost || room.status !== 'QUESTION') return room.answers;
  return Object.fromEntries(Object.entries(room.answers).map(([id, answer]) => [id, {
    questionId: answer.questionId, optionIndex: -1, timeTakenMs: 0, isCorrect: false, pointsEarned: 0,
  }]));
}
function snapshot(live: LiveRoom, session: SavedSession): GameRoom {
  const room = live.state;
  return {
    ...room,
    quiz: session.role === 'host' ? room.quiz : {
      ...room.quiz,
      // Preserve question count without downloading future clues or answer keys.
      questions: room.quiz.questions.map((question, index) => index === room.currentQuestionIndex
        ? publicQuestion(question, room.status !== 'QUESTION')
        : { id: '', text: '', options: [], correctOptionIndex: -1, timeLimit: 0, points: 0 }),
    },
    players: Object.fromEntries(Object.entries(room.players).map(([id, player]) => [id, summary(player)])),
    answers: safeAnswers(room, session.role === 'host'),
  };
}
function selfUpdate(live: LiveRoom, session: SavedSession) {
  const player = session.playerId && live.state.players[session.playerId];
  if (session.socket && player) send(session.socket, { type: 'SELF_UPDATED', player });
}
function flushRoom(live: LiveRoom) {
  if (live.flush) clearTimeout(live.flush);
  live.flush = undefined;
  const room = live.state;
  const phaseKey = `${room.status}:${room.currentQuestionIndex}:${room.questionStartedAt}`;
  const phaseChanged = phaseKey !== live.phaseKey;
  const { quiz, ...state } = room;
  const patch = { ...state, players: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, summary(p)])) };
  const question = phaseChanged ? quiz.questions[room.currentQuestionIndex] : undefined;
  // Two serializations per batch instead of one full quiz serialization per player.
  const hostPacket = JSON.stringify({ type: 'ROOM_PATCH', patch, question });
  const playerPacket = JSON.stringify({ type: 'ROOM_PATCH', patch: { ...patch, answers: safeAnswers(room, false) },
    question: question && publicQuestion(question, room.status !== 'QUESTION') });
  for (const ws of live.sockets) sendEncoded(ws, clients.get(ws)?.session?.role === 'host' ? hostPacket : playerPacket);
  live.phaseKey = phaseKey;
}
function scheduleRoom(live: LiveRoom) {
  // Burst joins and answers produce at most ten room updates per second.
  if (!live.flush) live.flush = setTimeout(() => flushRoom(live), 100);
}
function clearQuestionTimers(live: LiveRoom) {
  if (live.deadline) clearTimeout(live.deadline);
  if (live.advance) clearTimeout(live.advance);
  live.deadline = live.advance = undefined;
  live.botTimers.forEach(clearTimeout);
  live.botTimers = [];
}
function removeRoom(live: LiveRoom, reason: string) {
  clearQuestionTimers(live);
  if (live.flush) clearTimeout(live.flush);
  rooms.delete(live.state.code);
  for (const ws of live.sockets) {
    send(ws, { type: 'KICKED', reason });
    const meta = clients.get(ws);
    if (meta) { meta.live = undefined; meta.session = undefined; }
  }
  live.sockets.clear(); live.sessions.clear();
}
function removePlayer(live: LiveRoom, playerId: string, reason: string) {
  delete live.state.players[playerId]; delete live.state.answers[playerId];
  for (const [token, session] of live.sessions) {
    if (session.playerId !== playerId) continue;
    if (session.socket) {
      send(session.socket, { type: 'KICKED', reason });
      live.sockets.delete(session.socket);
      const meta = clients.get(session.socket);
      if (meta) { meta.live = undefined; meta.session = undefined; }
    }
    live.sessions.delete(token);
  }
  scheduleRoom(live); checkAllAnswered(live);
}
function leave(ws: WebSocket) {
  const meta = clients.get(ws);
  if (!meta?.live || !meta.session) return;
  if (meta.session.role === 'host') removeRoom(meta.live, 'The host closed this room.');
  else if (meta.session.playerId) removePlayer(meta.live, meta.session.playerId, 'You left the room.');
}
function bind(ws: WebSocket, live: LiveRoom, session: SavedSession) {
  const meta = clients.get(ws)!;
  // A refreshing tab can overlap its old socket's close event.
  if (session.socket && session.socket !== ws) {
    const oldSocket = session.socket;
    live.sockets.delete(oldSocket);
    const oldMeta = clients.get(oldSocket);
    if (oldMeta) { oldMeta.live = undefined; oldMeta.session = undefined; }
    oldSocket.close(4000, 'Session opened in another connection.');
  }
  meta.live = live; meta.session = session;
  session.socket = ws; session.disconnectedAt = undefined;
  live.sockets.add(ws); live.touchedAt = Date.now();
  if (session.role === 'host') live.hostDisconnectedAt = undefined;
  if (session.playerId && live.state.players[session.playerId]) live.state.players[session.playerId].connected = true;
}
function createSession(live: LiveRoom, role: Session['role'], playerId?: string): SavedSession {
  const session: SavedSession = { token: randomBytes(32).toString('hex'), role, roomCode: live.state.code, playerId };
  live.sessions.set(session.token, session); return session;
}
function credentials(session: SavedSession): Session {
  return { token: session.token, role: session.role, roomCode: session.roomCode, playerId: session.playerId };
}
function validQuiz(value: unknown): value is Quiz {
  const quiz = value as Quiz;
  return !!quiz && typeof quiz.id === 'string' && typeof quiz.title === 'string' && quiz.title.length <= 200
    && Array.isArray(quiz.questions) && quiz.questions.length > 0 && quiz.questions.length <= 1000
    && new Set(quiz.questions.map(q => q?.id)).size === quiz.questions.length
    && quiz.questions.every(q => q && typeof q.id === 'string' && !!q.id && typeof q.text === 'string' && q.text.length <= 10000
      && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 4
      && q.options.every(option => typeof option === 'string' && option.length <= 2000)
      && Number.isInteger(q.correctOptionIndex) && q.correctOptionIndex >= 0 && q.correctOptionIndex < q.options.length
      && Number.isFinite(q.timeLimit) && q.timeLimit >= 1 && q.timeLimit <= 300
      && Number.isFinite(q.points) && q.points >= 0 && q.points <= 100000
      && (q.imageUrl === undefined || q.imageUrl === '' || (typeof q.imageUrl === 'string' && q.imageUrl.length <= 512 * 1024
        && /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(q.imageUrl))));
}
function rankPlayers(live: LiveRoom) {
  const sorted = Object.values(live.state.players).sort((a, b) => b.score - a.score || a.totalAnswerTimeMs - b.totalAnswerTimeMs);
  sorted.forEach((player, index) => { player.rank = index + 1; }); return sorted;
}
function reveal(live: LiveRoom) {
  if (live.state.status !== 'QUESTION') return;
  clearQuestionTimers(live); live.state.status = 'REVEAL';
  for (const player of Object.values(live.state.players)) if (!live.state.answers[player.id]) player.streak = 0;
  rankPlayers(live);
  for (const session of live.sessions.values()) selfUpdate(live, session);
  flushRoom(live);
}
function podium(live: LiveRoom) {
  clearQuestionTimers(live); live.state.status = 'PODIUM';
  const players = rankPlayers(live);
  const totalAnswers = players.reduce((sum, p) => sum + p.answersCount, 0);
  live.state.roomAverages = {
    avgScore: Math.round(players.reduce((sum, p) => sum + p.score, 0) / Math.max(1, players.length)),
    avgAccuracy: Math.round(players.reduce((sum, p) => sum + (p.correctAnswersCount || 0), 0) / Math.max(1, totalAnswers) * 100),
    avgResponseTimeMs: Math.round(players.reduce((sum, p) => sum + p.totalAnswerTimeMs, 0) / Math.max(1, totalAnswers)),
  };
  for (const session of live.sessions.values()) selfUpdate(live, session);
  flushRoom(live);
}
function checkAllAnswered(live: LiveRoom) {
  if (live.state.status !== 'QUESTION' || !live.state.settings.autoAdvanceCountdown || live.advance) return;
  const active = Object.values(live.state.players).filter(p => p.connected);
  if (active.length && active.every(p => live.state.answers[p.id])) live.advance = setTimeout(() => {
    live.advance = undefined;
    const current = Object.values(live.state.players).filter(p => p.connected);
    if (current.length && current.every(p => live.state.answers[p.id])) reveal(live);
  }, 1200);
}
function recordAnswer(live: LiveRoom, player: Player, optionIndex: number, ws?: WebSocket) {
  const room = live.state;
  const question = room.quiz.questions[room.currentQuestionIndex];
  if (!question || room.status !== 'QUESTION' || room.answers[player.id]) return;
  const elapsed = Date.now() - room.questionStartedAt;
  if (elapsed >= question.timeLimit * 1000) {
    if (ws) send(ws, { type: 'ANSWER_REJECTED', questionId: question.id, message: 'Time is up for this question.' });
    reveal(live); return;
  }
  const isCorrect = optionIndex === question.correctOptionIndex;
  const timeTakenMs = Math.max(0, elapsed);
  const points = calculateSpeedPoints(isCorrect, room.settings.speedScoring ? timeTakenMs : 0,
    question.timeLimit, question.points, player.streak, room.settings.streakBonus).points;
  player.score += points; player.streak = isCorrect ? player.streak + 1 : 0;
  player.highestStreak = Math.max(player.highestStreak, player.streak);
  player.totalAnswerTimeMs += timeTakenMs; player.answersCount += 1;
  player.correctAnswersCount = (player.correctAnswersCount || 0) + (isCorrect ? 1 : 0);
  const answer = { questionId: question.id, questionText: question.text, optionIndex, timeTakenMs, isCorrect, pointsEarned: points };
  player.lastAnswer = answer; (player.answerHistory ??= []).push(answer); room.answers[player.id] = answer;
  if (ws) send(ws, { type: 'ANSWER_ACCEPTED', player, answer });
  scheduleRoom(live); checkAllAnswered(live);
}
function startQuestion(live: LiveRoom, index: number) {
  clearQuestionTimers(live);
  const room = live.state;
  const question = room.quiz.questions[index];
  if (!question) { podium(live); return; }
  room.status = 'QUESTION'; room.currentQuestionIndex = index;
  room.questionStartedAt = Date.now(); room.timeLimit = question.timeLimit; room.answers = {};
  flushRoom(live);
  // Deadlines work even when the host is disconnected or its background tab is throttled.
  live.deadline = setTimeout(() => reveal(live), question.timeLimit * 1000);
  for (const player of Object.values(room.players).filter(p => p.isSimulated)) {
    const delay = Math.min(question.timeLimit * 1000 - 50, 400 + Math.random() * question.timeLimit * 800);
    live.botTimers.push(setTimeout(() => {
      if (!room.players[player.id] || room.currentQuestionIndex !== index) return;
      const option = Math.random() < 0.75 ? question.correctOptionIndex : (question.correctOptionIndex + 1) % question.options.length;
      recordAnswer(live, player, option);
    }, delay));
  }
}
wss.on('connection', ws => {
  const meta: ClientMeta = { alive: true, windowStart: Date.now(), messageCount: 0 };
  clients.set(ws, meta);
  ws.on('error', () => ws.terminate());
  ws.on('pong', () => { meta.alive = true; });
  ws.on('message', raw => {
    try {
      const now = Date.now();
      if (now - meta.windowStart >= 10000) { meta.windowStart = now; meta.messageCount = 0; }
      if (++meta.messageCount > 100) { ws.close(1008, 'Too many requests.'); return; }
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      if (!msg || typeof msg.type !== 'string') throw new Error('Invalid request.');
      if (msg.type === 'PING') { send(ws, { type: 'PONG', clientTimestamp: msg.clientTimestamp, serverTime: Date.now() }); return; }
      if (msg.type === 'LEAVE_ROOM') { leave(ws); return; }
      if (msg.type === 'SESSION_RESUME') {
        const live = rooms.get(msg.roomCode);
        const session = live?.sessions.get(msg.token);
        if (!live || !session || (session.playerId && !live.state.players[session.playerId])) {
          send(ws, { type: 'SESSION_EXPIRED', message: 'Your room has ended or the server restarted. Please join a new room.' }); return;
        }
        if (meta.live && meta.session !== session) throw new Error('Leave the current room first.');
        bind(ws, live, session);
        send(ws, { type: 'SESSION_RESUMED', room: snapshot(live, session), session: credentials(session),
          player: session.playerId ? live.state.players[session.playerId] : undefined });
        scheduleRoom(live); return;
      }
      if (msg.type === 'HOST_CREATE_ROOM') {
        if (meta.live) throw new Error('Leave the current room before creating another.');
        if (!validQuiz(msg.quiz)) throw new Error('Invalid quiz. Use 1–1000 questions, 2–4 options, 1–300 seconds, and images under 384 KB.');
        if (rooms.size >= 100) throw new Error('The server is busy. Please try again later.');
        let code: string;
        do { code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(); } while (rooms.has(code));
        const live: LiveRoom = { state: { code, quiz: msg.quiz, status: 'LOBBY', currentQuestionIndex: -1,
          questionStartedAt: 0, timeLimit: msg.quiz.questions[0].timeLimit, players: {}, answers: {}, maxPlayers: 60,
          settings: { speedScoring: msg.settings?.speedScoring !== false, streakBonus: msg.settings?.streakBonus !== false,
            autoAdvanceCountdown: msg.settings?.autoAdvanceCountdown !== false }, createdAt: Date.now() },
          sockets: new Set(), sessions: new Map(), touchedAt: Date.now(), botTimers: [] };
        rooms.set(code, live);
        const session = createSession(live, 'host'); bind(ws, live, session);
        send(ws, { type: 'ROOM_CREATED', roomCode: code, room: snapshot(live, session), session: credentials(session) }); return;
      }
      if (msg.type === 'PLAYER_JOIN') {
        if (typeof msg.roomCode !== 'string' || typeof msg.nickname !== 'string' || !msg.nickname.trim()) throw new Error('Enter a room code and nickname.');
        const live = rooms.get(msg.roomCode.trim().toUpperCase());
        if (!live) { send(ws, { type: 'JOIN_ERROR', message: 'Room code not found. Check the PIN with the host.' }); return; }
        if (meta.live) {
          if (meta.live === live && meta.session?.playerId) {
            send(ws, { type: 'JOIN_SUCCESS', roomCode: live.state.code, room: snapshot(live, meta.session),
              player: live.state.players[meta.session.playerId], session: credentials(meta.session) }); return;
          }
          throw new Error('Leave the current room first.');
        }
        if (Object.keys(live.state.players).length >= live.state.maxPlayers) {
          send(ws, { type: 'JOIN_ERROR', message: 'This room is full (60 players). Ask the host to remove unused players.' }); return;
        }
        const nickname = msg.nickname.trim().slice(0, 16);
        let finalName = nickname, suffix = 2;
        while (Object.values(live.state.players).some(p => p.nickname.toLowerCase() === finalName.toLowerCase())) finalName = `${nickname.slice(0, 12)}${suffix++}`;
        const player: Player = { id: randomUUID(), nickname: finalName, avatar: FUN_AVATARS.includes(msg.avatar) ? msg.avatar : FUN_AVATARS[0],
          score: 0, streak: 0, highestStreak: 0, totalAnswerTimeMs: 0, answersCount: 0, correctAnswersCount: 0, connected: true };
        live.state.players[player.id] = player;
        const session = createSession(live, 'player', player.id); bind(ws, live, session);
        send(ws, { type: 'JOIN_SUCCESS', roomCode: live.state.code, room: snapshot(live, session), player, session: credentials(session) });
        scheduleRoom(live); return;
      }
      const live = meta.live;
      if (!live || !meta.session || !('roomCode' in msg) || msg.roomCode !== live.state.code) throw new Error('Join this room before sending commands.');
      if (msg.type.startsWith('HOST_') && meta.session.role !== 'host') throw new Error('Only this room’s host can use these controls.');
      live.touchedAt = Date.now();
      const room = live.state;
      switch (msg.type) {
        case 'HOST_START_GAME': if (room.status === 'LOBBY') startQuestion(live, 0); break;
        case 'HOST_NEXT_QUESTION': if (room.status === 'LEADERBOARD') startQuestion(live, room.currentQuestionIndex + 1); break;
        case 'HOST_REVEAL_QUESTION': reveal(live); break;
        case 'HOST_SHOW_LEADERBOARD':
          if (room.status !== 'REVEAL') break;
          room.status = 'LEADERBOARD'; rankPlayers(live); flushRoom(live); break;
        case 'HOST_SHOW_PODIUM': if (room.status === 'LEADERBOARD' || room.status === 'REVEAL') podium(live); break;
        case 'HOST_RESTART_GAME':
          clearQuestionTimers(live);
          room.status = 'LOBBY'; room.currentQuestionIndex = -1; room.answers = {}; room.questionStartedAt = 0;
          delete room.roomAverages;
          for (const player of Object.values(room.players)) {
            Object.assign(player, { score: 0, streak: 0, highestStreak: 0, totalAnswerTimeMs: 0,
              answersCount: 0, correctAnswersCount: 0, answerHistory: [] });
            delete player.lastAnswer; delete player.rank;
          }
          for (const session of live.sessions.values()) selfUpdate(live, session);
          flushRoom(live); break;
        case 'HOST_ADD_BOTS': {
          if (room.status !== 'LOBBY' || !Number.isInteger(msg.count) || msg.count < 1) break;
          const count = Math.min(msg.count, 60 - Object.keys(room.players).length);
          for (let index = 0; index < count; index++) {
            const id = `bot_${randomUUID()}`;
            const name = BOT_NAMES.find(n => !Object.values(room.players).some(p => p.nickname === n)) || `Bot${Object.keys(room.players).length + 1}`;
            room.players[id] = { id, nickname: name, avatar: FUN_AVATARS[index % FUN_AVATARS.length], score: 0, streak: 0,
              highestStreak: 0, totalAnswerTimeMs: 0, answersCount: 0, isSimulated: true, connected: true };
          }
          scheduleRoom(live); break;
        }
        case 'HOST_REMOVE_BOTS':
          if (room.status !== 'LOBBY') break;
          for (const player of Object.values(room.players)) if (player.isSimulated) delete room.players[player.id];
          scheduleRoom(live); break;
        case 'HOST_KICK_PLAYER': removePlayer(live, msg.playerId, 'You were removed by the host.'); break;
        case 'PLAYER_SUBMIT_ANSWER': {
          const player = meta.session.playerId && room.players[meta.session.playerId];
          if (!player || player.id !== msg.playerId) throw new Error('You can only submit your own answer.');
          const question = room.quiz.questions[room.currentQuestionIndex];
          if (room.status !== 'QUESTION' || !question || question.id !== msg.questionId) {
            send(ws, { type: 'ANSWER_REJECTED', questionId: msg.questionId, message: 'That question is no longer accepting answers.' }); break;
          }
          if (!Number.isInteger(msg.optionIndex) || msg.optionIndex < 0 || msg.optionIndex >= question.options.length) throw new Error('Invalid answer option.');
          if (room.answers[player.id]) { send(ws, { type: 'ANSWER_ACCEPTED', player, answer: room.answers[player.id] }); break; }
          recordAnswer(live, player, msg.optionIndex, ws); break;
        }
        default: throw new Error('Unknown request.');
      }
    } catch (error) {
      send(ws, { type: 'ERROR', message: error instanceof SyntaxError ? 'Invalid message format.' : error instanceof Error ? error.message : 'Request failed.' });
    }
  });
  ws.on('close', () => {
    const { live, session } = meta;
    clients.delete(ws);
    if (!live || !session || session.socket !== ws) return;
    live.sockets.delete(ws); session.socket = undefined; session.disconnectedAt = Date.now();
    if (session.role === 'host') live.hostDisconnectedAt = Date.now();
    const player = session.playerId && live.state.players[session.playerId];
    if (player) { player.connected = false; scheduleRoom(live); checkAllAnswered(live); }
  });
});
const heartbeat = setInterval(() => {
  const now = Date.now();
  for (const [ws, meta] of clients) {
    if (!meta.alive) { ws.terminate(); continue; }
    meta.alive = false; ws.ping();
  }
  for (const live of rooms.values()) {
    if (live.sockets.size) live.touchedAt = now;
    if (now - live.touchedAt > ROOM_IDLE_MS || (live.hostDisconnectedAt && now - live.hostDisconnectedAt > HOST_RECONNECT_MS)) {
      removeRoom(live, 'This room expired because the host disconnected.'); continue;
    }
    if (live.state.status === 'LOBBY') for (const session of live.sessions.values()) {
      if (session.playerId && session.disconnectedAt && now - session.disconnectedAt > LOBBY_RECONNECT_MS)
        removePlayer(live, session.playerId, 'Your disconnected lobby place expired. Please join again.');
    }
  }
}, 25000);
heartbeat.unref();
wss.on('close', () => clearInterval(heartbeat));
app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok', activeRooms: rooms.size, connections: clients.size, timestamp: Date.now() });
});
async function startServer() {
  if (process.argv.includes('--dev')) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use('/assets', express.static(path.join(root, 'dist/assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(path.join(root, 'dist'), { maxAge: 0 }));
    app.get('/api/*', (_req, res) => { res.status(404).json({ error: 'Not found' }); });
    app.get('*', (req, res) => {
      if (path.extname(req.path)) { res.sendStatus(404); return; }
      res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(root, 'dist/index.html'));
    });
  }
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  server.listen(port, '0.0.0.0', () => console.log(`[VelocityQuiz] Listening on port ${(server.address() as {port: number}).port}`));
}
startServer().catch(error => { console.error('Failed to start server:', error); process.exit(1); });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  for (const live of rooms.values()) removeRoom(live, 'The server is restarting. Ask the host for a new room.');
  for (const ws of clients.keys()) ws.close(1012, 'Server restarting.');
  wss.close(); server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
});
