import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// ----- Mongo Schemas -----
const LevelHistorySchema = new mongoose.Schema({
  level: Number,
  hpGain: Number,
  rolls: [Number]
}, { _id: false });

const PlayerSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['player', 'storyWeaver'], default: 'player' },
  race: { type: String, default: '' },        // ⭐ NEW
  className: { type: String, default: '' },   // ⭐ NEW
  level: { type: Number, default: 1 },
  maxHp: { type: Number, default: 18 },
  currentHp: { type: Number, default: 18 },
  nexus: { type: Number, default: 40 },
  maxNexus: { type: Number, default: 40 },
  stress: { type: Number, default: 0 },
  levelHistory: [LevelHistorySchema]
}, { _id: false });

const StorySchema = new mongoose.Schema({
  activeConflict: {
    id: String,
    name: String,
    round: Number
  }
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true, index: true },
  players: [PlayerSchema],
  mapUrl: String,
  story: StorySchema
}, { timestamps: true });

const Session = mongoose.model('Session', SessionSchema);

// ----- Cache -----
const sessionsCache = new Map();

async function getOrCreateSession(sessionId) {
  if (sessionsCache.has(sessionId)) return sessionsCache.get(sessionId);

  let session = await Session.findOne({ sessionId });
  if (!session) {
    session = new Session({
      sessionId,
      players: [],
      mapUrl: '',
      story: { activeConflict: null }
    });
    await session.save();
  }

  sessionsCache.set(sessionId, session);
  return session;
}

// ----- Express + WebSocket -----
const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.sessionId = null;
  ws.playerId = null;

  ws.on('message', async data => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.error("Invalid JSON", err);
      return;
    }

    try {
      await handleMessage(ws, msg);
    } catch (e) {
      console.error("Error handling message", e);
    }
  });

  ws.on('close', () => {
    // We keep players in the session for persistence
  });
});

// ----- Helpers -----
function broadcastToSession(sessionId, payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.sessionId === sessionId) {
      client.send(data);
    }
  });
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function roll3d6() {
  const r1 = rollDie(6);
  const r2 = rollDie(6);
  const r3 = rollDie(6);
  return { total: r1 + r2 + r3, rolls: [r1, r2, r3] };
}

// ----- Message Handler -----
async function handleMessage(ws, msg) {
  const type = msg.type;

  //
  // JOIN SESSION
  //
  if (type === 'joinSession') {
    let { sessionId, playerName, role, race, className } = msg;

    sessionId = (sessionId || '').trim().toUpperCase();
    if (!sessionId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing sessionId' }));
      return;
    }

    console.log("JOIN SESSION:", sessionId, "player:", playerName);

    const session = await getOrCreateSession(sessionId);

    const playerId = uuidv4();
    const player = {
      playerId,
      name: playerName || "Unnamed",
      role: role === "storyWeaver" ? "storyWeaver" : "player",
      race: race || '',
      className: className || '',
      level: 1,
      maxHp: 18,
      currentHp: 18,
      nexus: 40,
      maxNexus: 40,
      stress: 0,
      levelHistory: []
    };

    session.players.push(player);
    await session.save();

    ws.sessionId = sessionId;
    ws.playerId = playerId;

    ws.send(JSON.stringify({
      type: "sessionState",
      sessionId,
      you: player,
      players: session.players,
      mapUrl: session.mapUrl,
      story: session.story
    }));

    broadcastToSession(sessionId, {
      type: "playersUpdate",
      players: session.players
    });
  }

  //
  // REJOIN SESSION
  //
  else if (type === 'rejoinSession') {
    let { sessionId, playerId } = msg;

    sessionId = (sessionId || "").trim().toUpperCase();
    const session = await getOrCreateSession(sessionId);
    const player = session.players.find(p => p.playerId === playerId);

    if (!player) {
      ws.send(JSON.stringify({ type: "error", message: "Player not found" }));
      return;
    }

    ws.sessionId = sessionId;
    ws.playerId = playerId;

    ws.send(JSON.stringify({
      type: "sessionState",
      sessionId,
      you: player,
      players: session.players,
      mapUrl: session.mapUrl,
      story: session.story
    }));
  }

  //
  // ROLL DICE
  //
  else if (type === 'rollDice') {
    const sessionId = ws.sessionId;
    const playerId = ws.playerId;
    if (!sessionId || !playerId) return;

    const session = await getOrCreateSession(sessionId);
    const player = session.players.find(p => p.playerId === playerId);
    if (!player) return;

    const result = rollDie(msg.die || 6);

    broadcastToSession(sessionId, {
      type: "diceResult",
      die: msg.die,
      result,
      playerId,
      playerName: player.name
    });
  }

  //
  // LEVEL UP
  //
  else if (type === 'levelUp') {
    const sessionId = ws.sessionId;
    const playerId = ws.playerId;
    if (!sessionId || !playerId) return;

    const session = await getOrCreateSession(sessionId);
    const player = session.players.find(p => p.playerId === playerId);
    if (!player) return;

    const { total, rolls } = roll3d6();

    player.level += 1;
    player.maxHp += total;
    player.currentHp += total;
    player.levelHistory.push({ level: player.level, hpGain: total, rolls });

    session.markModified("players");
    await session.save();

    broadcastToSession(sessionId, {
      type: "playersUpdate",
      players: session.players
    });
  }

  //
  // LEVEL DOWN
  //
  else if (type === 'levelDown') {
    const sessionId = ws.sessionId;
    const playerId = ws.playerId;
    if (!sessionId || !playerId) return;

    const session = await getOrCreateSession(sessionId);
    const player = session.players.find(p => p.playerId === playerId);
    if (!player || player.levelHistory.length === 0) return;

    const last = player.levelHistory.pop();
    player.maxHp -= last.hpGain;
    player.currentHp = Math.min(player.currentHp, player.maxHp);
    player.level = Math.max(1, player.level - 1);

    session.markModified("players");
    await session.save();

    broadcastToSession(sessionId, {
      type: "playersUpdate",
      players: session.players
    });
  }

  //
  // SET MAP
  //
  else if (type === 'setMap') {
    const sessionId = ws.sessionId;
    if (!sessionId) return;

    const session = await getOrCreateSession(sessionId);
    session.mapUrl = msg.url || "";
    await session.save();

    broadcastToSession(sessionId, {
      type: "mapUpdate",
      url: session.mapUrl
    });
  }

  //
  // START CONFLICT
  //
  else if (type === 'startConflict') {
    const sessionId = ws.sessionId;
    const playerId = ws.playerId;
    if (!sessionId || !playerId) return;

    const session = await getOrCreateSession(sessionId);
    const player = session.players.find(p => p.playerId === playerId);
    if (!player || player.role !== "storyWeaver") return;

    session.story = {
      activeConflict: {
        id: String(Date.now()),
        name: msg.name || "Unnamed Conflict",
        round: 1
      }
    };

    await session.save();

    broadcastToSession(sessionId, {
      type: "storyUpdate",
      story: session.story
    });
  }

  //
  // END CONFLICT
  //
  else if (type === 'endConflict') {
    const sessionId = ws.sessionId;
    const playerId = ws.playerId;
    if (!sessionId || !playerId) return;

    const session = await getOrCreateSession(sessionId);
    const player = session.players.find(p => p.playerId === playerId);
    if (!player || player.role !== "storyWeaver") return;

    session.story = { activeConflict: null };
    await session.save();

    broadcastToSession(sessionId, {
      type: "storyUpdate",
      story: session.story
    });
  }

  //
  // REMOVE PLAYER (Story Weaver only)
  //
  else if (type === 'removePlayer') {
    const { targetId } = msg;
    const sessionId = ws.sessionId;
    const playerId = ws.playerId;
    if (!sessionId || !playerId) return;

    const session = await getOrCreateSession(sessionId);
    const requester = session.players.find(p => p.playerId === playerId);
    if (!requester || requester.role !== "storyWeaver") {
      console.warn("Unauthorized removePlayer attempt.");
      return;
    }

    session.players = session.players.filter(p => p.playerId !== targetId);

    session.markModified('players');
    await session.save();

    broadcastToSession(sessionId, {
      type: "playersUpdate",
      players: session.players
    });

    console.log(`Player removed: ${targetId}`);
  }

  //
  // UPDATE NEXUS
  //
  else if (type === 'updateNexus') {
    const { sessionId, playerId, amount } = msg;
    const session = await getOrCreateSession(sessionId);

    const player = session.players.find(p => p.playerId === playerId);
    if (!player) return;

    player.nexus = Math.max(
      0,
      Math.min(player.nexus + amount, player.maxNexus || 40)
    );

    session.markModified("players");
    await session.save();

    broadcastToSession(sessionId, {
      type: "playersUpdate",
      players: session.players
    });
  }

  //
  // UPDATE STRESS
  //
  else if (type === 'updateStress') {
    const { sessionId, playerId, amount } = msg;
    const session = await getOrCreateSession(sessionId);

    const player = session.players.find(p => p.playerId === playerId);
    if (!player) return;

    player.stress = Math.max(0, Math.min(player.stress + amount, 10));

    session.markModified("players");
    await session.save();

    broadcastToSession(sessionId, {
      type: "playersUpdate",
      players: session.players
    });

    if (player.stress === 10) {
      broadcastToSession(sessionId, {
        type: "shatterEvent",
        playerId,
        message: `${player.name} has reached SHATTER!`
      });
    }
  }
}

// ----- Start Server -----
(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
})();
