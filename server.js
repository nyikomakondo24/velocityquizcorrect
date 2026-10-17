// server.ts
import express from "express";
import compression from "compression";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";

// src/utils/scoring.ts
function calculateSpeedPoints(isCorrect, timeTakenMs, timeLimitSec, maxPoints = 1e3, currentStreak = 0, enableStreaks = true) {
  if (!isCorrect) {
    return {
      points: 0,
      basePoints: 0,
      speedBonus: 0,
      streakBonus: 0,
      speedRatio: 0
    };
  }
  const timeLimitMs = Math.max(1e3, timeLimitSec * 1e3);
  const clampedTimeTaken = Math.min(Math.max(0, timeTakenMs), timeLimitMs);
  const speedRatio = Math.max(0, (timeLimitMs - clampedTimeTaken) / timeLimitMs);
  const basePoints = Math.round(maxPoints * 0.5);
  const speedBonus = Math.round(maxPoints * 0.5 * speedRatio);
  const subtotal = basePoints + speedBonus;
  let streakMultiplier = 1;
  if (enableStreaks && currentStreak >= 2) {
    if (currentStreak === 2) streakMultiplier = 1.1;
    else if (currentStreak <= 4) streakMultiplier = 1.2;
    else streakMultiplier = 1.3;
  }
  const streakBonus = Math.round(subtotal * (streakMultiplier - 1));
  const finalPoints = subtotal + streakBonus;
  return {
    points: finalPoints,
    basePoints,
    speedBonus,
    streakBonus,
    speedRatio
  };
}

// src/data/defaultQuizzes.ts
var DEFAULT_QUIZZES = [
  {
    id: "speed-tech-science",
    title: "Velocity Science & Tech Blitz",
    description: "Lightning-round trivia spanning cutting-edge science, computing history, space, and physics.",
    category: "Science & Technology",
    createdAt: Date.now(),
    questions: [
      {
        id: "q1",
        text: "What is the approximate speed of light in a vacuum?",
        options: [
          "300,000 km/s",
          "150,000 km/s",
          "1,080,000 km/s",
          "30,000 km/s"
        ],
        correctOptionIndex: 0,
        timeLimit: 12,
        points: 1e3,
        category: "Physics",
        explanation: "Light travels at approximately 299,792 kilometers per second in a vacuum."
      },
      {
        id: "q2",
        text: "Which programming language was created by Brendan Eich in just 10 days in 1995?",
        options: [
          "Python",
          "JavaScript",
          "Ruby",
          "PHP"
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1e3,
        category: "Technology",
        explanation: "JavaScript was famously designed and built in 10 days for Netscape Navigator."
      },
      {
        id: "q3",
        text: "What planet in our Solar System has the shortest day (fastest rotation)?",
        options: [
          "Mercury",
          "Mars",
          "Jupiter",
          "Saturn"
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1e3,
        category: "Astronomy",
        explanation: "Jupiter rotates once every 9 hours and 55 minutes, making its day the shortest of all planets."
      },
      {
        id: "q4",
        text: "What fundamental particle carries the electromagnetic force?",
        options: [
          "Gluon",
          "Photon",
          "Higgs Boson",
          "Graviton"
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1e3,
        category: "Physics",
        explanation: "The photon is the quantum gauge boson for electromagnetism."
      },
      {
        id: "q5",
        text: "In computer science, what is the time complexity of binary search on a sorted array?",
        options: [
          "O(1)",
          "O(n)",
          "O(log n)",
          "O(n log n)"
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1e3,
        category: "Computer Science",
        explanation: "Binary search halves the search space each step, running in O(log n) logarithmic time."
      },
      {
        id: "q6",
        text: "Which chemical element has the highest electrical conductivity at room temperature?",
        options: [
          "Copper",
          "Gold",
          "Silver",
          "Aluminum"
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1e3,
        category: "Chemistry",
        explanation: "Silver has the highest electrical conductivity of all metals, followed closely by copper."
      },
      {
        id: "q7",
        text: "How many bits are in a single byte?",
        options: [
          "4 bits",
          "8 bits",
          "16 bits",
          "32 bits"
        ],
        correctOptionIndex: 1,
        timeLimit: 10,
        points: 1e3,
        category: "Technology",
        explanation: "A standard byte consists of 8 bits."
      },
      {
        id: "q8",
        text: "Which human organ consumes approximately 20% of the body\u2019s total metabolic energy?",
        options: [
          "Heart",
          "Liver",
          "Brain",
          "Lungs"
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1e3,
        category: "Biology",
        explanation: "Despite making up only about 2% of body weight, the human brain consumes 20% of resting energy."
      }
    ]
  },
  {
    id: "world-geography-blitz",
    title: "World Capitals & Geography Sprint",
    description: "Fast-paced identification of global capitals, flags, continents, and geographical records.",
    category: "Geography",
    createdAt: Date.now() - 1e4,
    questions: [
      {
        id: "g1",
        text: "What is the capital city of Australia?",
        options: [
          "Sydney",
          "Melbourne",
          "Canberra",
          "Brisbane"
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1e3,
        category: "Capitals",
        explanation: "Canberra was selected as Australia\u2019s compromise capital between Sydney and Melbourne in 1908."
      },
      {
        id: "g2",
        text: "Which is the deepest lake in the world, holding 20% of Earth\u2019s unfrozen surface fresh water?",
        options: [
          "Lake Superior",
          "Lake Baikal",
          "Lake Victoria",
          "Lake Tanganyika"
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1e3,
        category: "Nature",
        explanation: "Lake Baikal in Siberia plunges to 1,642 meters (5,387 feet) deep."
      },
      {
        id: "g3",
        text: "Which country has the most natural lakes in the world?",
        options: [
          "Canada",
          "Russia",
          "United States",
          "Finland"
        ],
        correctOptionIndex: 0,
        timeLimit: 12,
        points: 1e3,
        category: "Geography",
        explanation: "Canada contains over 60% of all the lakes in the world (over 879,000 lakes)."
      },
      {
        id: "g4",
        text: "Which strait separates Europe from Africa at its narrowest point of only 14 km?",
        options: [
          "Strait of Malacca",
          "Strait of Hormuz",
          "Strait of Gibraltar",
          "Bosphorus Strait"
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1e3,
        category: "Geography",
        explanation: "The Strait of Gibraltar connects the Atlantic Ocean to the Mediterranean Sea."
      },
      {
        id: "g5",
        text: "What is the only country in the world that is also a continent?",
        options: [
          "Greenland",
          "Australia",
          "Madagascar",
          "Iceland"
        ],
        correctOptionIndex: 1,
        timeLimit: 10,
        points: 1e3,
        category: "Continents",
        explanation: "Australia is uniquely classified as both a sovereign country and a distinct continent."
      },
      {
        id: "g6",
        text: "What is the capital city of Canada?",
        options: [
          "Toronto",
          "Montreal",
          "Vancouver",
          "Ottawa"
        ],
        correctOptionIndex: 3,
        timeLimit: 12,
        points: 1e3,
        category: "Capitals",
        explanation: "Ottawa was named the capital of the Province of Canada by Queen Victoria in 1857."
      }
    ]
  },
  {
    id: "pop-culture-cinema",
    title: "Pop Culture & Cinema Velocity",
    description: "Fast reflex questions on blockbuster movies, music history, iconic games, and entertainment.",
    category: "Entertainment",
    createdAt: Date.now() - 2e4,
    questions: [
      {
        id: "p1",
        text: "In the Marvel Cinematic Universe, what is the fictional metal mined in Wakanda?",
        options: [
          "Adamantium",
          "Vibranium",
          "Uru",
          "Beskar"
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1e3,
        category: "Movies",
        explanation: "Vibranium is the legendary kinetic-energy absorbing metal of Wakanda."
      },
      {
        id: "p2",
        text: "Which Nintendo franchise features the protagonist Link and Princess Zelda?",
        options: [
          "Metroid",
          "Fire Emblem",
          "The Legend of Zelda",
          "Super Mario"
        ],
        correctOptionIndex: 2,
        timeLimit: 10,
        points: 1e3,
        category: "Gaming",
        explanation: "The Legend of Zelda first launched in 1986 on the Famicom/NES."
      },
      {
        id: "p3",
        text: "What movie won the Academy Award for Best Picture in 2024?",
        options: [
          "Barbie",
          "Oppenheimer",
          "Poor Things",
          "Killers of the Flower Moon"
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1e3,
        category: "Cinema",
        explanation: "Christopher Nolan\u2019s Oppenheimer won seven Oscars including Best Picture."
      },
      {
        id: "p4",
        text: "Which album by Michael Jackson is the best-selling studio album of all time?",
        options: [
          "Bad",
          "Thriller",
          "Off the Wall",
          "Dangerous"
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1e3,
        category: "Music",
        explanation: "Released in 1982, Thriller has sold an estimated 70+ million copies worldwide."
      },
      {
        id: "p5",
        text: "Which film pioneered bullet-time visual effects in 1999?",
        options: [
          "The Matrix",
          "Fight Club",
          "Star Wars: The Phantom Menace",
          "Gladiator"
        ],
        correctOptionIndex: 0,
        timeLimit: 12,
        points: 1e3,
        category: "Cinema",
        explanation: "The Wachowskis\u2019 The Matrix revolutionized action cinema with its green tint and 360-degree camera rigs."
      }
    ]
  },
  {
    id: "rapid-math-logic",
    title: "Rapid Mental Math & Logic Riddles",
    description: "High-speed calculations and tricky logic riddles where quick intuition beats overthinking.",
    category: "Math & Logic",
    createdAt: Date.now() - 3e4,
    questions: [
      {
        id: "m1",
        text: "What is 15% of 80?",
        options: [
          "10",
          "12",
          "14",
          "16"
        ],
        correctOptionIndex: 1,
        timeLimit: 10,
        points: 1e3,
        category: "Mental Math",
        explanation: "10% of 80 is 8, 5% is 4. 8 + 4 = 12!"
      },
      {
        id: "m2",
        text: "If a bat and ball cost $1.10 in total, and the bat costs $1.00 more than the ball, how much does the ball cost?",
        options: [
          "$0.10",
          "$0.05",
          "$0.01",
          "$0.15"
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1e3,
        category: "Logic",
        explanation: "Ball = $0.05, Bat = $1.05. Total = $1.10, and Bat is exactly $1.00 more than Ball."
      },
      {
        id: "m3",
        text: "What is the square of 13?",
        options: [
          "144",
          "156",
          "169",
          "196"
        ],
        correctOptionIndex: 2,
        timeLimit: 10,
        points: 1e3,
        category: "Mental Math",
        explanation: "13 \xD7 13 = 169."
      },
      {
        id: "m4",
        text: "How many sides does a regular heptagon have?",
        options: [
          "6",
          "7",
          "8",
          "9"
        ],
        correctOptionIndex: 1,
        timeLimit: 10,
        points: 1e3,
        category: "Geometry",
        explanation: "A heptagon (or septagon) is a polygon with 7 sides and 7 angles."
      },
      {
        id: "m5",
        text: "What comes next in the sequence: 2, 6, 12, 20, 30, ...?",
        options: [
          "40",
          "42",
          "44",
          "46"
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1e3,
        category: "Patterns",
        explanation: "Differences are +4, +6, +8, +10, so next difference is +12. 30 + 12 = 42."
      }
    ]
  }
];
var FUN_AVATARS = [
  "\u26A1",
  "\u{1F680}",
  "\u{1F525}",
  "\u{1F981}",
  "\u{1F98A}",
  "\u{1F42F}",
  "\u{1F984}",
  "\u{1F43C}",
  "\u{1F985}",
  "\u{1F43A}",
  "\u{1F988}",
  "\u{1F916}",
  "\u{1F47E}",
  "\u{1F3AF}",
  "\u{1F451}",
  "\u{1F48E}",
  "\u{1F31F}",
  "\u{1F355}",
  "\u{1F3B8}",
  "\u{1F3CE}\uFE0F",
  "\u{1F3C6}",
  "\u{1F32A}\uFE0F",
  "\u{1F4A5}",
  "\u{1F6F8}"
];
var BOT_NAMES = [
  "SpeedySam",
  "QuantumQuizzer",
  "TriviaNinja",
  "NeonVolt",
  "TurboTina",
  "PixelPilot",
  "FlashGordon",
  "BlazeRider",
  "CyberNova",
  "RapidRay",
  "EchoPulse",
  "AeroAce",
  "SonicSpecter",
  "VortexVince",
  "HyperHawk",
  "AstroAlex",
  "CosmicCleo",
  "BlitzBot",
  "ZenithZoe",
  "OmegaOwl",
  "FalconFury",
  "MatrixMax",
  "SparkySteve",
  "ChronoChris",
  "NebulaNick",
  "ApexArcher",
  "SolarSprint",
  "DynamoDan",
  "VelocityVal",
  "PhantomPip",
  "PrismPete",
  "TitanToby",
  "RacerRyan",
  "BoltBella",
  "ShadowSam",
  "StarlightSue",
  "VectorVic",
  "MirageMaya",
  "ThunderTom",
  "GlitchGabe",
  "CipherClara",
  "ByteBen",
  "RocketRita",
  "FrostFox",
  "KineticKai",
  "PulsePaul",
  "ApexAnna",
  "SpecterSyd",
  "WhizKidWill",
  "NovaNathan",
  "Stratosphere",
  "HorizonHank",
  "TurboTrixie",
  "ZenonZack",
  "QuarkQuinn",
  "LaserLuke",
  "MeteorMolly",
  "VerveVera",
  "WarpWalker",
  "DriftDave"
];

// server.ts
var root = path.dirname(fileURLToPath(import.meta.url));
var app = express();
app.disable("x-powered-by");
app.use(compression());
var server = http.createServer(app);
var wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024, perMessageDeflate: false });
server.on("upgrade", (request, socket, head) => {
  if (new URL(request.url || "/", "http://localhost").pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
  } else if (!process.argv.includes("--dev")) socket.destroy();
});
var rooms = /* @__PURE__ */ new Map();
var clients = /* @__PURE__ */ new Map();
var ROOM_IDLE_MS = 2 * 60 * 60 * 1e3;
var LOBBY_RECONNECT_MS = 2 * 60 * 1e3;
var HOST_RECONNECT_MS = 10 * 60 * 1e3;
function send(ws, message) {
  sendEncoded(ws, JSON.stringify(message));
}
function sendEncoded(ws, packet) {
  if (ws.readyState !== WebSocket.OPEN) return;
  if (ws.bufferedAmount > (clients.get(ws)?.session?.role === "host" ? 12 : 2) * 1024 * 1024) {
    ws.close(1013, "Slow connection. Please reconnect.");
    return;
  }
  ws.send(packet, (error) => {
    if (error) ws.terminate();
  });
}
function summary(player) {
  const { answerHistory, lastAnswer, ...publicPlayer } = player;
  return publicPlayer;
}
function publicQuestion(question, reveal2) {
  if (reveal2) return question;
  const { correctOptionIndex, explanation, ...safe } = question;
  return { ...safe, correctOptionIndex: -1 };
}
function safeAnswers(room, isHost) {
  if (isHost || room.status !== "QUESTION") return room.answers;
  return Object.fromEntries(Object.entries(room.answers).map(([id, answer]) => [id, {
    questionId: answer.questionId,
    optionIndex: -1,
    timeTakenMs: 0,
    isCorrect: false,
    pointsEarned: 0
  }]));
}
function snapshot(live, session) {
  const room = live.state;
  return {
    ...room,
    quiz: session.role === "host" ? room.quiz : {
      ...room.quiz,
      // Preserve question count without downloading future clues or answer keys.
      questions: room.quiz.questions.map((question, index) => index === room.currentQuestionIndex ? publicQuestion(question, room.status !== "QUESTION") : { id: "", text: "", options: [], correctOptionIndex: -1, timeLimit: 0, points: 0 })
    },
    players: Object.fromEntries(Object.entries(room.players).map(([id, player]) => [id, summary(player)])),
    answers: safeAnswers(room, session.role === "host")
  };
}
function selfUpdate(live, session) {
  const player = session.playerId && live.state.players[session.playerId];
  if (session.socket && player) send(session.socket, { type: "SELF_UPDATED", player });
}
function flushRoom(live) {
  if (live.flush) clearTimeout(live.flush);
  live.flush = void 0;
  const room = live.state;
  const phaseKey = `${room.status}:${room.currentQuestionIndex}:${room.questionStartedAt}`;
  const phaseChanged = phaseKey !== live.phaseKey;
  const { quiz, ...state } = room;
  const patch = { ...state, players: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, summary(p)])) };
  const question = phaseChanged ? quiz.questions[room.currentQuestionIndex] : void 0;
  const hostPacket = JSON.stringify({ type: "ROOM_PATCH", patch, question });
  const playerPacket = JSON.stringify({
    type: "ROOM_PATCH",
    patch: { ...patch, answers: safeAnswers(room, false) },
    question: question && publicQuestion(question, room.status !== "QUESTION")
  });
  for (const ws of live.sockets) sendEncoded(ws, clients.get(ws)?.session?.role === "host" ? hostPacket : playerPacket);
  live.phaseKey = phaseKey;
}
function scheduleRoom(live) {
  if (!live.flush) live.flush = setTimeout(() => flushRoom(live), 100);
}
function clearQuestionTimers(live) {
  if (live.deadline) clearTimeout(live.deadline);
  if (live.advance) clearTimeout(live.advance);
  live.deadline = live.advance = void 0;
  live.botTimers.forEach(clearTimeout);
  live.botTimers = [];
}
function removeRoom(live, reason) {
  clearQuestionTimers(live);
  if (live.flush) clearTimeout(live.flush);
  rooms.delete(live.state.code);
  for (const ws of live.sockets) {
    send(ws, { type: "KICKED", reason });
    const meta = clients.get(ws);
    if (meta) {
      meta.live = void 0;
      meta.session = void 0;
    }
  }
  live.sockets.clear();
  live.sessions.clear();
}
function removePlayer(live, playerId, reason) {
  delete live.state.players[playerId];
  delete live.state.answers[playerId];
  for (const [token, session] of live.sessions) {
    if (session.playerId !== playerId) continue;
    if (session.socket) {
      send(session.socket, { type: "KICKED", reason });
      live.sockets.delete(session.socket);
      const meta = clients.get(session.socket);
      if (meta) {
        meta.live = void 0;
        meta.session = void 0;
      }
    }
    live.sessions.delete(token);
  }
  scheduleRoom(live);
  checkAllAnswered(live);
}
function leave(ws) {
  const meta = clients.get(ws);
  if (!meta?.live || !meta.session) return;
  if (meta.session.role === "host") removeRoom(meta.live, "The host closed this room.");
  else if (meta.session.playerId) removePlayer(meta.live, meta.session.playerId, "You left the room.");
}
function bind(ws, live, session) {
  const meta = clients.get(ws);
  if (session.socket && session.socket !== ws) {
    const oldSocket = session.socket;
    live.sockets.delete(oldSocket);
    const oldMeta = clients.get(oldSocket);
    if (oldMeta) {
      oldMeta.live = void 0;
      oldMeta.session = void 0;
    }
    oldSocket.close(4e3, "Session opened in another connection.");
  }
  meta.live = live;
  meta.session = session;
  session.socket = ws;
  session.disconnectedAt = void 0;
  live.sockets.add(ws);
  live.touchedAt = Date.now();
  if (session.role === "host") live.hostDisconnectedAt = void 0;
  if (session.playerId && live.state.players[session.playerId]) live.state.players[session.playerId].connected = true;
}
function createSession(live, role, playerId) {
  const session = { token: randomBytes(32).toString("hex"), role, roomCode: live.state.code, playerId };
  live.sessions.set(session.token, session);
  return session;
}
function credentials(session) {
  return { token: session.token, role: session.role, roomCode: session.roomCode, playerId: session.playerId };
}
function validQuiz(value) {
  const quiz = value;
  return !!quiz && typeof quiz.id === "string" && typeof quiz.title === "string" && quiz.title.length <= 200 && Array.isArray(quiz.questions) && quiz.questions.length > 0 && quiz.questions.length <= 1e3 && new Set(quiz.questions.map((q) => q?.id)).size === quiz.questions.length && quiz.questions.every((q) => q && typeof q.id === "string" && !!q.id && typeof q.text === "string" && q.text.length <= 1e4 && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 4 && q.options.every((option) => typeof option === "string" && option.length <= 2e3) && Number.isInteger(q.correctOptionIndex) && q.correctOptionIndex >= 0 && q.correctOptionIndex < q.options.length && Number.isFinite(q.timeLimit) && q.timeLimit >= 1 && q.timeLimit <= 300 && Number.isFinite(q.points) && q.points >= 0 && q.points <= 1e5 && (q.imageUrl === void 0 || q.imageUrl === "" || typeof q.imageUrl === "string" && q.imageUrl.length <= 512 * 1024 && /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(q.imageUrl)));
}
function rankPlayers(live) {
  const sorted = Object.values(live.state.players).sort((a, b) => b.score - a.score || a.totalAnswerTimeMs - b.totalAnswerTimeMs);
  sorted.forEach((player, index) => {
    player.rank = index + 1;
  });
  return sorted;
}
function reveal(live) {
  if (live.state.status !== "QUESTION") return;
  clearQuestionTimers(live);
  live.state.status = "REVEAL";
  for (const player of Object.values(live.state.players)) if (!live.state.answers[player.id]) player.streak = 0;
  rankPlayers(live);
  for (const session of live.sessions.values()) selfUpdate(live, session);
  flushRoom(live);
}
function podium(live) {
  clearQuestionTimers(live);
  live.state.status = "PODIUM";
  const players = rankPlayers(live);
  const totalAnswers = players.reduce((sum, p) => sum + p.answersCount, 0);
  live.state.roomAverages = {
    avgScore: Math.round(players.reduce((sum, p) => sum + p.score, 0) / Math.max(1, players.length)),
    avgAccuracy: Math.round(players.reduce((sum, p) => sum + (p.correctAnswersCount || 0), 0) / Math.max(1, totalAnswers) * 100),
    avgResponseTimeMs: Math.round(players.reduce((sum, p) => sum + p.totalAnswerTimeMs, 0) / Math.max(1, totalAnswers))
  };
  for (const session of live.sessions.values()) selfUpdate(live, session);
  flushRoom(live);
}
function checkAllAnswered(live) {
  if (live.state.status !== "QUESTION" || !live.state.settings.autoAdvanceCountdown || live.advance) return;
  const active = Object.values(live.state.players).filter((p) => p.connected);
  if (active.length && active.every((p) => live.state.answers[p.id])) live.advance = setTimeout(() => {
    live.advance = void 0;
    const current = Object.values(live.state.players).filter((p) => p.connected);
    if (current.length && current.every((p) => live.state.answers[p.id])) reveal(live);
  }, 1200);
}
function recordAnswer(live, player, optionIndex, ws) {
  const room = live.state;
  const question = room.quiz.questions[room.currentQuestionIndex];
  if (!question || room.status !== "QUESTION" || room.answers[player.id]) return;
  const elapsed = Date.now() - room.questionStartedAt;
  if (elapsed >= question.timeLimit * 1e3) {
    if (ws) send(ws, { type: "ANSWER_REJECTED", questionId: question.id, message: "Time is up for this question." });
    reveal(live);
    return;
  }
  const isCorrect = optionIndex === question.correctOptionIndex;
  const timeTakenMs = Math.max(0, elapsed);
  const points = calculateSpeedPoints(
    isCorrect,
    room.settings.speedScoring ? timeTakenMs : 0,
    question.timeLimit,
    question.points,
    player.streak,
    room.settings.streakBonus
  ).points;
  player.score += points;
  player.streak = isCorrect ? player.streak + 1 : 0;
  player.highestStreak = Math.max(player.highestStreak, player.streak);
  player.totalAnswerTimeMs += timeTakenMs;
  player.answersCount += 1;
  player.correctAnswersCount = (player.correctAnswersCount || 0) + (isCorrect ? 1 : 0);
  const answer = { questionId: question.id, questionText: question.text, optionIndex, timeTakenMs, isCorrect, pointsEarned: points };
  player.lastAnswer = answer;
  (player.answerHistory ??= []).push(answer);
  room.answers[player.id] = answer;
  if (ws) send(ws, { type: "ANSWER_ACCEPTED", player, answer });
  scheduleRoom(live);
  checkAllAnswered(live);
}
function startQuestion(live, index) {
  clearQuestionTimers(live);
  const room = live.state;
  const question = room.quiz.questions[index];
  if (!question) {
    podium(live);
    return;
  }
  room.status = "QUESTION";
  room.currentQuestionIndex = index;
  room.questionStartedAt = Date.now();
  room.timeLimit = question.timeLimit;
  room.answers = {};
  flushRoom(live);
  live.deadline = setTimeout(() => reveal(live), question.timeLimit * 1e3);
  for (const player of Object.values(room.players).filter((p) => p.isSimulated)) {
    const delay = Math.min(question.timeLimit * 1e3 - 50, 400 + Math.random() * question.timeLimit * 800);
    live.botTimers.push(setTimeout(() => {
      if (!room.players[player.id] || room.currentQuestionIndex !== index) return;
      const option = Math.random() < 0.75 ? question.correctOptionIndex : (question.correctOptionIndex + 1) % question.options.length;
      recordAnswer(live, player, option);
    }, delay));
  }
}
wss.on("connection", (ws) => {
  const meta = { alive: true, windowStart: Date.now(), messageCount: 0 };
  clients.set(ws, meta);
  ws.on("error", () => ws.terminate());
  ws.on("pong", () => {
    meta.alive = true;
  });
  ws.on("message", (raw) => {
    try {
      const now = Date.now();
      if (now - meta.windowStart >= 1e4) {
        meta.windowStart = now;
        meta.messageCount = 0;
      }
      if (++meta.messageCount > 100) {
        ws.close(1008, "Too many requests.");
        return;
      }
      const msg = JSON.parse(raw.toString());
      if (!msg || typeof msg.type !== "string") throw new Error("Invalid request.");
      if (msg.type === "PING") {
        send(ws, { type: "PONG", clientTimestamp: msg.clientTimestamp, serverTime: Date.now() });
        return;
      }
      if (msg.type === "LEAVE_ROOM") {
        leave(ws);
        return;
      }
      if (msg.type === "SESSION_RESUME") {
        const live2 = rooms.get(msg.roomCode);
        const session = live2?.sessions.get(msg.token);
        if (!live2 || !session || session.playerId && !live2.state.players[session.playerId]) {
          send(ws, { type: "SESSION_EXPIRED", message: "Your room has ended or the server restarted. Please join a new room." });
          return;
        }
        if (meta.live && meta.session !== session) throw new Error("Leave the current room first.");
        bind(ws, live2, session);
        send(ws, {
          type: "SESSION_RESUMED",
          room: snapshot(live2, session),
          session: credentials(session),
          player: session.playerId ? live2.state.players[session.playerId] : void 0
        });
        scheduleRoom(live2);
        return;
      }
      if (msg.type === "HOST_CREATE_ROOM") {
        if (meta.live) throw new Error("Leave the current room before creating another.");
        if (!validQuiz(msg.quiz)) throw new Error("Invalid quiz. Use 1\u20131000 questions, 2\u20134 options, 1\u2013300 seconds, and images under 384 KB.");
        if (rooms.size >= 100) throw new Error("The server is busy. Please try again later.");
        let code;
        do {
          code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
        } while (rooms.has(code));
        const live2 = {
          state: {
            code,
            quiz: msg.quiz,
            status: "LOBBY",
            currentQuestionIndex: -1,
            questionStartedAt: 0,
            timeLimit: msg.quiz.questions[0].timeLimit,
            players: {},
            answers: {},
            maxPlayers: 60,
            settings: {
              speedScoring: msg.settings?.speedScoring !== false,
              streakBonus: msg.settings?.streakBonus !== false,
              autoAdvanceCountdown: msg.settings?.autoAdvanceCountdown !== false
            },
            createdAt: Date.now()
          },
          sockets: /* @__PURE__ */ new Set(),
          sessions: /* @__PURE__ */ new Map(),
          touchedAt: Date.now(),
          botTimers: []
        };
        rooms.set(code, live2);
        const session = createSession(live2, "host");
        bind(ws, live2, session);
        send(ws, { type: "ROOM_CREATED", roomCode: code, room: snapshot(live2, session), session: credentials(session) });
        return;
      }
      if (msg.type === "PLAYER_JOIN") {
        if (typeof msg.roomCode !== "string" || typeof msg.nickname !== "string" || !msg.nickname.trim()) throw new Error("Enter a room code and nickname.");
        const live2 = rooms.get(msg.roomCode.trim().toUpperCase());
        if (!live2) {
          send(ws, { type: "JOIN_ERROR", message: "Room code not found. Check the PIN with the host." });
          return;
        }
        if (meta.live) {
          if (meta.live === live2 && meta.session?.playerId) {
            send(ws, {
              type: "JOIN_SUCCESS",
              roomCode: live2.state.code,
              room: snapshot(live2, meta.session),
              player: live2.state.players[meta.session.playerId],
              session: credentials(meta.session)
            });
            return;
          }
          throw new Error("Leave the current room first.");
        }
        if (Object.keys(live2.state.players).length >= live2.state.maxPlayers) {
          send(ws, { type: "JOIN_ERROR", message: "This room is full (60 players). Ask the host to remove unused players." });
          return;
        }
        const nickname = msg.nickname.trim().slice(0, 16);
        let finalName = nickname, suffix = 2;
        while (Object.values(live2.state.players).some((p) => p.nickname.toLowerCase() === finalName.toLowerCase())) finalName = `${nickname.slice(0, 12)}${suffix++}`;
        const player = {
          id: randomUUID(),
          nickname: finalName,
          avatar: FUN_AVATARS.includes(msg.avatar) ? msg.avatar : FUN_AVATARS[0],
          score: 0,
          streak: 0,
          highestStreak: 0,
          totalAnswerTimeMs: 0,
          answersCount: 0,
          correctAnswersCount: 0,
          connected: true
        };
        live2.state.players[player.id] = player;
        const session = createSession(live2, "player", player.id);
        bind(ws, live2, session);
        send(ws, { type: "JOIN_SUCCESS", roomCode: live2.state.code, room: snapshot(live2, session), player, session: credentials(session) });
        scheduleRoom(live2);
        return;
      }
      const live = meta.live;
      if (!live || !meta.session || !("roomCode" in msg) || msg.roomCode !== live.state.code) throw new Error("Join this room before sending commands.");
      if (msg.type.startsWith("HOST_") && meta.session.role !== "host") throw new Error("Only this room\u2019s host can use these controls.");
      live.touchedAt = Date.now();
      const room = live.state;
      switch (msg.type) {
        case "HOST_START_GAME":
          if (room.status === "LOBBY") startQuestion(live, 0);
          break;
        case "HOST_NEXT_QUESTION":
          if (room.status === "LEADERBOARD") startQuestion(live, room.currentQuestionIndex + 1);
          break;
        case "HOST_REVEAL_QUESTION":
          reveal(live);
          break;
        case "HOST_SHOW_LEADERBOARD":
          if (room.status !== "REVEAL") break;
          room.status = "LEADERBOARD";
          rankPlayers(live);
          flushRoom(live);
          break;
        case "HOST_SHOW_PODIUM":
          if (room.status === "LEADERBOARD" || room.status === "REVEAL") podium(live);
          break;
        case "HOST_RESTART_GAME":
          clearQuestionTimers(live);
          room.status = "LOBBY";
          room.currentQuestionIndex = -1;
          room.answers = {};
          room.questionStartedAt = 0;
          delete room.roomAverages;
          for (const player of Object.values(room.players)) {
            Object.assign(player, {
              score: 0,
              streak: 0,
              highestStreak: 0,
              totalAnswerTimeMs: 0,
              answersCount: 0,
              correctAnswersCount: 0,
              answerHistory: []
            });
            delete player.lastAnswer;
            delete player.rank;
          }
          for (const session of live.sessions.values()) selfUpdate(live, session);
          flushRoom(live);
          break;
        case "HOST_ADD_BOTS": {
          if (room.status !== "LOBBY" || !Number.isInteger(msg.count) || msg.count < 1) break;
          const count = Math.min(msg.count, 60 - Object.keys(room.players).length);
          for (let index = 0; index < count; index++) {
            const id = `bot_${randomUUID()}`;
            const name = BOT_NAMES.find((n) => !Object.values(room.players).some((p) => p.nickname === n)) || `Bot${Object.keys(room.players).length + 1}`;
            room.players[id] = {
              id,
              nickname: name,
              avatar: FUN_AVATARS[index % FUN_AVATARS.length],
              score: 0,
              streak: 0,
              highestStreak: 0,
              totalAnswerTimeMs: 0,
              answersCount: 0,
              isSimulated: true,
              connected: true
            };
          }
          scheduleRoom(live);
          break;
        }
        case "HOST_REMOVE_BOTS":
          if (room.status !== "LOBBY") break;
          for (const player of Object.values(room.players)) if (player.isSimulated) delete room.players[player.id];
          scheduleRoom(live);
          break;
        case "HOST_KICK_PLAYER":
          removePlayer(live, msg.playerId, "You were removed by the host.");
          break;
        case "PLAYER_SUBMIT_ANSWER": {
          const player = meta.session.playerId && room.players[meta.session.playerId];
          if (!player || player.id !== msg.playerId) throw new Error("You can only submit your own answer.");
          const question = room.quiz.questions[room.currentQuestionIndex];
          if (room.status !== "QUESTION" || !question || question.id !== msg.questionId) {
            send(ws, { type: "ANSWER_REJECTED", questionId: msg.questionId, message: "That question is no longer accepting answers." });
            break;
          }
          if (!Number.isInteger(msg.optionIndex) || msg.optionIndex < 0 || msg.optionIndex >= question.options.length) throw new Error("Invalid answer option.");
          if (room.answers[player.id]) {
            send(ws, { type: "ANSWER_ACCEPTED", player, answer: room.answers[player.id] });
            break;
          }
          recordAnswer(live, player, msg.optionIndex, ws);
          break;
        }
        default:
          throw new Error("Unknown request.");
      }
    } catch (error) {
      send(ws, { type: "ERROR", message: error instanceof SyntaxError ? "Invalid message format." : error instanceof Error ? error.message : "Request failed." });
    }
  });
  ws.on("close", () => {
    const { live, session } = meta;
    clients.delete(ws);
    if (!live || !session || session.socket !== ws) return;
    live.sockets.delete(ws);
    session.socket = void 0;
    session.disconnectedAt = Date.now();
    if (session.role === "host") live.hostDisconnectedAt = Date.now();
    const player = session.playerId && live.state.players[session.playerId];
    if (player) {
      player.connected = false;
      scheduleRoom(live);
      checkAllAnswered(live);
    }
  });
});
var heartbeat = setInterval(() => {
  const now = Date.now();
  for (const [ws, meta] of clients) {
    if (!meta.alive) {
      ws.terminate();
      continue;
    }
    meta.alive = false;
    ws.ping();
  }
  for (const live of rooms.values()) {
    if (live.sockets.size) live.touchedAt = now;
    if (now - live.touchedAt > ROOM_IDLE_MS || live.hostDisconnectedAt && now - live.hostDisconnectedAt > HOST_RECONNECT_MS) {
      removeRoom(live, "This room expired because the host disconnected.");
      continue;
    }
    if (live.state.status === "LOBBY") for (const session of live.sessions.values()) {
      if (session.playerId && session.disconnectedAt && now - session.disconnectedAt > LOBBY_RECONNECT_MS)
        removePlayer(live, session.playerId, "Your disconnected lobby place expired. Please join again.");
    }
  }
}, 25e3);
heartbeat.unref();
wss.on("close", () => clearInterval(heartbeat));
app.get("/api/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ status: "ok", activeRooms: rooms.size, connections: clients.size, timestamp: Date.now() });
});
async function startServer() {
  if (process.argv.includes("--dev")) {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use("/assets", express.static(path.join(root, "dist/assets"), { immutable: true, maxAge: "1y" }));
    app.use(express.static(path.join(root, "dist"), { maxAge: 0 }));
    app.get("/api/*", (_req, res) => {
      res.status(404).json({ error: "Not found" });
    });
    app.get("*", (req, res) => {
      if (path.extname(req.path)) {
        res.sendStatus(404);
        return;
      }
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(root, "dist/index.html"));
    });
  }
  const port = process.env.PORT ? Number(process.env.PORT) : 3e3;
  server.listen(port, "0.0.0.0", () => console.log(`[VelocityQuiz] Listening on port ${server.address().port}`));
}
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  for (const live of rooms.values()) removeRoom(live, "The server is restarting. Ask the host for a new room.");
  for (const ws of clients.keys()) ws.close(1012, "Server restarting.");
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3e3).unref();
});
