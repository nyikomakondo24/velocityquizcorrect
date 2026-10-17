export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  timeLimit: number; // in seconds (e.g. 10, 15, 20)
  points: number; // base points (e.g. 1000)
  category?: string;
  explanation?: string;
  imageUrl?: string; // Image URL or Data URL for visual clues/puzzles
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  questions: Question[];
  isCustom?: boolean;
  createdAt: number;
}

export interface AnswerRecord {
  questionId: string;
  questionText?: string;
  optionIndex: number;
  timeTakenMs: number;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface RoomAverages {
  avgScore: number;
  avgAccuracy: number; // percentage e.g. 65
  avgResponseTimeMs: number;
}

export interface Player {
  id: string;
  nickname: string;
  avatar: string; // Emoji avatar e.g. ⚡, 🚀, 🦊, 🐯
  score: number;
  streak: number;
  highestStreak: number;
  totalAnswerTimeMs: number;
  answersCount: number;
  correctAnswersCount?: number;
  isSimulated?: boolean;
  connected: boolean;
  rank?: number;
  lastAnswer?: AnswerRecord;
  answerHistory?: AnswerRecord[];
}

export type RoomStatus =
  | 'LOBBY'
  | 'STARTING'
  | 'QUESTION'
  | 'REVEAL'
  | 'LEADERBOARD'
  | 'PODIUM';

export interface RoomSettings {
  speedScoring: boolean;
  streakBonus: boolean;
  autoAdvanceCountdown: boolean;
}

export interface AnswerDistribution {
  [optionIndex: number]: number; // count of players who chose this option
}

export interface GameRoom {
  code: string;
  quiz: Quiz;
  status: RoomStatus;
  currentQuestionIndex: number;
  questionStartedAt: number;
  timeLimit: number; // seconds
  players: Record<string, Player>;
  answers: Record<string, AnswerRecord>;
  maxPlayers: number;
  settings: RoomSettings;
  createdAt: number;
  roomAverages?: RoomAverages;
  serverClockOffsetMs?: number; // browser estimate, never used for scoring
}

export interface Session {
  token: string;
  role: 'host' | 'player';
  roomCode: string;
  playerId?: string;
}

// Client to Server WebSocket messages
export type ClientMessage =
  | { type: 'PING'; clientTimestamp: number }
  | { type: 'SESSION_RESUME'; roomCode: string; token: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'HOST_CREATE_ROOM'; quiz: Quiz; settings?: Partial<RoomSettings> }
  | { type: 'HOST_START_GAME'; roomCode: string }
  | { type: 'HOST_NEXT_QUESTION'; roomCode: string }
  | { type: 'HOST_REVEAL_QUESTION'; roomCode: string }
  | { type: 'HOST_SHOW_LEADERBOARD'; roomCode: string }
  | { type: 'HOST_SHOW_PODIUM'; roomCode: string }
  | { type: 'HOST_RESTART_GAME'; roomCode: string }
  | { type: 'HOST_ADD_BOTS'; roomCode: string; count: number }
  | { type: 'HOST_REMOVE_BOTS'; roomCode: string }
  | { type: 'HOST_KICK_PLAYER'; roomCode: string; playerId: string }
  | { type: 'PLAYER_JOIN'; roomCode: string; nickname: string; avatar: string }
  | { type: 'PLAYER_SUBMIT_ANSWER'; roomCode: string; playerId: string; questionId: string; optionIndex: number; clientTimestamp: number };

// The shared room patch never includes the full quiz or player histories.
export type ServerMessage =
  | { type: 'PONG'; clientTimestamp: number; serverTime: number }
  | { type: 'ROOM_CREATED'; roomCode: string; room: GameRoom; session: Session }
  | { type: 'ROOM_PATCH'; patch: Omit<Partial<GameRoom>, 'quiz'>; question?: Question }
  | { type: 'JOIN_SUCCESS'; roomCode: string; player: Player; room: GameRoom; session: Session }
  | { type: 'SESSION_RESUMED'; room: GameRoom; player?: Player; session: Session }
  | { type: 'SESSION_EXPIRED'; message: string }
  | { type: 'JOIN_ERROR'; message: string }
  | { type: 'SELF_UPDATED'; player: Player }
  | { type: 'ANSWER_ACCEPTED'; player: Player; answer: AnswerRecord }
  | { type: 'ANSWER_REJECTED'; questionId: string; message: string }
  | { type: 'KICKED'; reason: string }
  | { type: 'ERROR'; message: string };
