
// -----------------------------------------------------------------------------
// Realms of Syncretis – Live Session Server (UPDATED: Enemy Level Support)
// -----------------------------------------------------------------------------
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const enemiesModule = require("./enemies.js");
const ENEMIES =
  enemiesModule?.ENEMIES ||
  enemiesModule?.default?.ENEMIES ||
  enemiesModule?.default ||
  enemiesModule;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------------------------
// STATIC FILES
// -----------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------------------------------------------------------
// SESSION STATE
// -----------------------------------------------------------------------------
const sessions = {}; // { SESSIONID: { players, enemies, story, map, tokens } }

function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcast(sessionId, obj) {
  const session = sessions[sessionId];
  if (!session) return;
  session.players.forEach(p => send(p.ws, obj));
}

function ensureSession(sid) {
  if (!sessions[sid]) {
    sessions[sid] = {
      players: [],
      enemies: [],
      story: {},
      map: {},
      tokens: {}
    };
  }
  return sessions[sid];
}

function stripWS(player) {
  const clone = { ...player };
  delete clone.ws;
  return clone;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// -----------------------------------------------------------------------------
// DICE
// -----------------------------------------------------------------------------
function rollSingleDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}
function rollDice(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i++) total += rollSingleDie(sides);
  return total;
}

// -----------------------------------------------------------------------------
// ENEMY DEF LOOKUP
// -----------------------------------------------------------------------------
function getEnemyDef(enemyKey) {
  if (!ENEMIES) return null;
  return ENEMIES[enemyKey] ||
    Object.values(ENEMIES).find(e => e.key === enemyKey) ||
    null;
}

// -----------------------------------------------------------------------------
// WEBSOCKET
// -----------------------------------------------------------------------------
wss.on("connection", ws => {
  ws.on("message", data => {
    let msg;
    try { msg = JSON.parse(data); }
    catch { return; }

    const type = msg.type;

    // JOIN
    if (type === "joinSession") {
      const sid = String(msg.sessionId || "").toUpperCase();
      if (!sid) return;
      const session = ensureSession(sid);

      const player = {
        playerId: "P" + Math.random().toString(36).slice(2),
        name: msg.playerName,
        race: msg.race,
        className: msg.className,
        role: msg.role || "player",
        ws,
        level: 1,
        maxHp: 10,
        currentHp: 10,
        stress: 0,
        maxNexus: 40,
        nexus: 40
      };

      session.players.push(player);

      send(ws, {
        type: "sessionState",
        sessionId: sid,
        you: stripWS(player),
        players: session.players.map(stripWS),
        enemies: session.enemies,
        map: session.map,
        story: session.story
      });

      broadcast(sid, { type: "playersList", players: session.players.map(stripWS) });
      return;
    }

    // PLAYER UPDATE
    if (type === "playerUpdate") {
      const session = sessions[msg.sessionId];
      if (!session) return;

      const idx = session.players.findIndex(p => p.playerId === msg.playerId);
      if (idx === -1) return;

      const existing = session.players[idx];
      session.players[idx] = { ...existing, ...msg.player, ws: existing.ws };

      broadcast(msg.sessionId, {
        type: "playerUpdate",
        player: stripWS(session.players[idx]),
        players: session.players.map(stripWS)
      });
      return;
    }

    // ADD ENEMY
    if (type === "addEnemy") {
      const session = sessions[msg.sessionId];
      if (!session) return;

      const def = getEnemyDef(msg.enemyKey);
      if (!def) return;

      const enemy = {
        instanceId: "E" + Math.random().toString(36).slice(2),
        key: def.key || msg.enemyKey,
        name: def.name || msg.enemyKey,
        level: 1,
        levelHistory: [],
        maxHp: def.maxHp ?? 10,
        hp: def.maxHp ?? 10,
        maxNexus: def.maxNexus ?? 0,
        nexus: def.maxNexus ?? 0,
        stress: 0
      };

      session.enemies.push(enemy);
      broadcast(msg.sessionId, { type: "enemyState", enemies: session.enemies });
      return;
    }

    // ENEMY UPDATE (LEVEL UP / DOWN SUPPORT)
    if (type === "enemyUpdate") {
      const session = sessions[msg.sessionId];
      if (!session) return;

      const idx = session.enemies.findIndex(e => e.instanceId === msg.enemy.instanceId);
      if (idx === -1) return;

      session.enemies[idx] = {
        ...session.enemies[idx],
        ...msg.enemy
      };

      broadcast(msg.sessionId, { type: "enemyState", enemies: session.enemies });
      return;
    }
  });
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
