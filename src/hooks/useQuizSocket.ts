import { useEffect, useRef, useState, useCallback } from 'react';
import type { ClientMessage, ServerMessage, GameRoom, Player, Session } from '../types/quiz';

const SESSION_KEY = 'velocity_session_v1';
function readSession(storageKey: string): Session | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    const pin = new URLSearchParams(location.search).get('pin')?.toUpperCase();
    return saved && typeof saved.token === 'string' && typeof saved.roomCode === 'string'
      && ['host', 'player'].includes(saved.role) && (!pin || pin === saved.roomCode) ? saved : null;
  } catch { return null; }
}
export function useQuizSocket(storageKey = SESSION_KEY) {
  const socketRef = useRef<WebSocket | null>(null);
  const [savedSession] = useState(() => readSession(storageKey));
  const sessionRef = useRef<Session | null>(savedSession);
  const playerRef = useRef<Player | null>(null);
  const roomRef = useRef<GameRoom | null>(null);
  const pendingRef = useRef<ClientMessage | null>(null);
  const readyRef = useRef(false);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const answerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const offsetRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [role, setRole] = useState<Session['role'] | null>(sessionRef.current?.role ?? null);
  const [isPending, setIsPending] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const remember = useCallback((session: Session | null) => {
    sessionRef.current = session;
    setRole(session?.role ?? null);
    try {
      if (session) sessionStorage.setItem(storageKey, JSON.stringify(session));
      else sessionStorage.removeItem(storageKey);
    } catch { /* Reconnect within this page still works when storage is blocked. */ }
  }, [storageKey]);
  const commitRoom = useCallback((next: GameRoom | null) => {
    if (next) {
      const self = playerRef.current;
      next = { ...next, serverClockOffsetMs: offsetRef.current };
      if (self && next.players[self.id]) {
        next.players = { ...next.players, [self.id]: self };
        if (self.lastAnswer?.questionId === next.quiz.questions[next.currentQuestionIndex]?.id)
          next.answers = { ...next.answers, [self.id]: self.lastAnswer };
      }
    }
    roomRef.current = next;
    setRoom(next);
  }, []);
  const commitPlayer = useCallback((next: Player | null) => {
    playerRef.current = next;
    setPlayer(next);
  }, []);

  useEffect(() => {
    let mounted = true, retries = 0, resuming = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let connectTimer: ReturnType<typeof setTimeout> | undefined;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let lastSeen = Date.now();
    function finishPending() {
      clearTimeout(actionTimer.current);
      pendingRef.current = null;
      setIsPending(false);
    }
    function clearSession(message: string) {
      remember(null); commitPlayer(null); commitRoom(null);
      finishPending(); clearTimeout(answerTimer.current);
      setConnectionError(message);
    }
    function markReady() {
      readyRef.current = true; resuming = false; retries = 0;
      setIsConnected(true);
      const pending = pendingRef.current;
      if (pending && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(pending));
        pendingRef.current = null;
      }
    }
    function ping() {
      const ws = socketRef.current;
      if (ws?.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastSeen > 45000) { ws.close(); return; }
      ws.send(JSON.stringify({ type: 'PING', clientTimestamp: Date.now() }));
    }
    function connect() {
      if (!mounted) return;
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${location.host}/ws`);
      socketRef.current = ws;
      connectTimer = setTimeout(() => ws.close(), 10000);
      ws.onopen = () => {
        if (!mounted || socketRef.current !== ws) return;
        clearTimeout(connectTimer); lastSeen = Date.now();
        setConnectionError(null); ping();
        heartbeatTimer = setInterval(ping, 15000);
        if (sessionRef.current) {
          resuming = true;
          ws.send(JSON.stringify({ type: 'SESSION_RESUME', roomCode: sessionRef.current.roomCode, token: sessionRef.current.token }));
          connectTimer = setTimeout(() => ws.close(), 10000);
        } else markReady();
      };
      ws.onmessage = event => {
        if (!mounted || socketRef.current !== ws) return;
        lastSeen = Date.now();
        try {
          const data: ServerMessage = JSON.parse(event.data);
          switch (data.type) {
            case 'PONG': {
              const rtt = Date.now() - data.clientTimestamp;
              if (rtt >= 0 && rtt < 5000) {
                offsetRef.current = data.serverTime - (data.clientTimestamp + rtt / 2);
                if (roomRef.current) commitRoom(roomRef.current);
              }
              break;
            }
            case 'ROOM_CREATED': case 'JOIN_SUCCESS': case 'SESSION_RESUMED':
              remember(data.session);
              commitPlayer('player' in data ? data.player ?? null : null);
              commitRoom(data.room); finishPending();
              clearTimeout(answerTimer.current); clearTimeout(connectTimer);
              setConnectionError(null); setAnswerError(null); markReady(); break;
            case 'ROOM_PATCH': {
              const current = roomRef.current;
              if (!current) break;
              const next = { ...current, ...data.patch };
              if (data.question) {
                const questions = [...current.quiz.questions];
                questions[next.currentQuestionIndex] = data.question;
                next.quiz = { ...current.quiz, questions };
              }
              const self = playerRef.current;
              if (self && next.players[self.id]) commitPlayer({ ...self, ...next.players[self.id] });
              if (next.currentQuestionIndex !== current.currentQuestionIndex || next.status !== current.status) {
                clearTimeout(answerTimer.current); setAnswerError(null);
              }
              commitRoom(next); break;
            }
            case 'SELF_UPDATED': case 'ANSWER_ACCEPTED':
              commitPlayer(data.player);
              if (roomRef.current) commitRoom(roomRef.current);
              if (data.type === 'ANSWER_ACCEPTED') { clearTimeout(answerTimer.current); setAnswerError(null); }
              break;
            case 'ANSWER_REJECTED':
              if (data.questionId === roomRef.current?.quiz.questions[roomRef.current.currentQuestionIndex]?.id) {
                clearTimeout(answerTimer.current); setAnswerError(data.message);
              }
              break;
            case 'SESSION_EXPIRED':
              clearTimeout(connectTimer); clearSession(data.message); markReady(); break;
            case 'KICKED':
              if (sessionRef.current) clearSession(data.reason);
              break;
            case 'JOIN_ERROR': case 'ERROR':
              finishPending(); setConnectionError(data.message);
              if (resuming) { clearSession(data.message); markReady(); }
              break;
          }
        } catch (error) { console.error('Invalid server message', error); }
      };
      ws.onclose = event => {
        if (!mounted || socketRef.current !== ws) return;
        clearTimeout(connectTimer); clearInterval(heartbeatTimer);
        readyRef.current = false; setIsConnected(false);
        if (event.code === 4000) {
          clearSession('This session is open in another connection. Reload to take it back.');
          return;
        }
        // Jitter prevents sixty phones reconnecting in lockstep after an interruption.
        const delay = Math.min(10000, 500 * 2 ** Math.min(retries++, 5)) + Math.random() * 500;
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    }
    function wake() {
      if (document.visibilityState === 'hidden') return;
      if (socketRef.current?.readyState === WebSocket.OPEN) ping();
      else if (socketRef.current?.readyState === WebSocket.CLOSED) {
        clearTimeout(reconnectTimer); connect();
      }
    }
    connect();
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      mounted = false; readyRef.current = false;
      clearTimeout(reconnectTimer); clearTimeout(connectTimer); clearInterval(heartbeatTimer);
      clearTimeout(actionTimer.current); clearTimeout(answerTimer.current);
      window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake);
      socketRef.current?.close();
    };
  }, [remember, commitRoom, commitPlayer]);

  const sendMessage = useCallback((message: ClientMessage): boolean => {
    const ws = socketRef.current;
    if (message.type === 'HOST_CREATE_ROOM' && new Blob([JSON.stringify(message)]).size > 8 * 1024 * 1024) {
      setConnectionError('This quiz is too large to host (8 MB maximum). Use fewer or smaller clue images.');
      return false;
    }
    const isJoin = message.type === 'HOST_CREATE_ROOM' || message.type === 'PLAYER_JOIN';
    if (isJoin) {
      setIsPending(true); setConnectionError(null);
      clearTimeout(actionTimer.current);
      actionTimer.current = setTimeout(() => {
        pendingRef.current = null; setIsPending(false);
        setConnectionError('The server did not confirm the request. Check your connection and try again.');
      }, 15000);
    }
    if (!readyRef.current || ws?.readyState !== WebSocket.OPEN) {
      if (isJoin && !sessionRef.current) { pendingRef.current = message; return true; }
      setConnectionError('Reconnecting. Please wait for the connection before trying again.');
      return false;
    }
    if (message.type === 'PLAYER_SUBMIT_ANSWER') {
      setAnswerError(null); clearTimeout(answerTimer.current);
      answerTimer.current = setTimeout(() => setAnswerError('Answer not confirmed. Try again if time remains.'), 8000);
    }
    ws.send(JSON.stringify(message));
    return true;
  }, []);
  const leaveRoom = useCallback(() => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
    remember(null); commitPlayer(null); commitRoom(null);
    pendingRef.current = null; setIsPending(false); setConnectionError(null); setAnswerError(null);
    clearTimeout(actionTimer.current); clearTimeout(answerTimer.current);
  }, [remember, commitPlayer, commitRoom]);
  return { isConnected, isPending, role, room, player, leaveRoom, connectionError, answerError, setConnectionError, sendMessage };
}
