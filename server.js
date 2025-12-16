// -----------------------------------------------------------------------------
// Realms of Syncretis – Live Session Server
// -----------------------------------------------------------------------------
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

// IMPORTANT:
// enemies.js must be CommonJS for require() to work:
//   module.exports = { ENEMIES };
// If your enemies.js uses `export const ENEMIES = ...`, it will be undefined here.
const enemiesModule = require("./enemies.js");
const ENEMIES = enemiesModule?.ENEMIES || enemiesModule?.default?.ENEMIES || enemiesModule?.default || enemiesModule;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------------------------
// STATIC FILES (SERVE THE UI FROM Public/)
// -----------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------------------------------------------------------
// SESSION STATE
// -----------------------------------------------------------------------------
const sessions = {}; // { SESSIONID: { players: [], story: {}, map: {}, enemies: [] } }

// Simple helper
function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

// Broadcast to all players in a session
function broadcast(sessionId, obj) {
  const session = sessions[sessionId];
  if (!session) return;
  session.players.forEach((p) => send(p.ws, obj));
}

// -----------------------------------------------------------------------------
// DICE HELPERS (SERVER AUTHORITY FOR ENEMIES)
// -----------------------------------------------------------------------------
function rollSingleDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides) {
  const rolls = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const r = rollSingleDie(sides);
    rolls.push(r);
    total += r;
  }
  return { rolls, total };
}

// supports "2d6" or "2d6+1d4"
function rollFormula(formula) {
  const clean = String(formula || "").trim();
  if (!clean || clean === "—") return { total: 0, breakdown: "No roll." };

  const parts = clean.split("+").map((s) => s.trim()).filter(Boolean);
  let total = 0;
  const breakdownParts = [];

  for (const part of parts) {
    const m = part.match(/^(\d+)d(\d+)$/i);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    const d = parseInt(m[2], 10);
    const { rolls, total: sub } = rollDice(n, d);
    total += sub;
    breakdownParts.push(`${n}d${d}: [${rolls.join(", ")}] => ${sub}`);
  }

  return { total, breakdown: breakdownParts.join(" | ") || "No roll." };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ensureSession(sid) {
  if (!sessions[sid]) {
    sessions[sid] = { players: [], story: {}, map: {}, enemies: [], tokens: {} };
  }
  const s = sessions[sid];
  if (!Array.isArray(s.players)) s.players = [];
  if (!Array.isArray(s.enemies)) s.enemies = [];
  if (!s.story) s.story = {};
  if (!s.map) s.map = {};
  if (!s.tokens) s.tokens = {}; // ✅ important for sessions created before tokens existed
  return s;
}


function stripWS(player) {
  const clone = { ...player };
  delete clone.ws;
  return clone;
}

function broadcastPlayersList(sessionId) {
  const session = sessions[sessionId];
  if (!session) return;

  broadcast(sessionId, {
    type: "playersList",
    players: session.players.map(stripWS)
  });
}

function getPlayerName(session, pid) {
  const p = session.players.find((pl) => pl.playerId === pid);
  return p ? p.name : "Unknown";
}

// For safety: enemy.key might be "stone_hopper", but ENEMIES might store under same key.
// This resolves consistently.
function getEnemyDef(enemyKey) {
  if (!ENEMIES) return null;
  return ENEMIES[enemyKey] || Object.values(ENEMIES).find((e) => e.key === enemyKey) || null;
}

// -----------------------------------------------------------------------------
// WEBSOCKET CONNECTION
// -----------------------------------------------------------------------------
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      console.log("Invalid JSON:", data);
      return;
    }

    const type = msg.type;

    // -------------------------------------------------------------------------
    // 1) JOIN SESSION
    // -------------------------------------------------------------------------
    if (type === "joinSession") {
      const { sessionId, playerName, race, className, role } = msg;
      const sid = String(sessionId || "").toUpperCase();
      if (!sid) return;

      const session = ensureSession(sid);

      const playerId = "P" + Math.random().toString(36).slice(2);
      const player = {
        playerId,
        name: playerName,
        race,
        className,
        role: role || "player",
        ws,
        level: 1,
        maxHp: 10,
        currentHp: 10,
        stress: 0,
        maxNexus: 40,
        nexus: 40
      };

      session.players.push(player);

      send(ws, { type: "sessionJoined", sessionId: sid, playerId });

      send(ws, {
  type: "sessionState",
  sessionId: sid,
  you: stripWS(player),
  players: session.players.map(stripWS),
  map: session.map,
  story: session.story,
  enemies: session.enemies
});


      broadcastPlayersList(sid);
      return;
    }

    // -------------------------------------------------------------------------
    // 2) REJOIN SESSION
    // -------------------------------------------------------------------------
    if (type === "rejoinSession") {
      const sid = String(msg.sessionId || "").toUpperCase();
      const pid = msg.playerId;

      const session = sessions[sid];
      if (!session) return;

      const player = session.players.find((p) => p.playerId === pid);
      if (!player) return;

      player.ws = ws; // rebind socket

      send(ws, {
        type: "sessionState",
        sessionId: sid,
        you: stripWS(player),
        players: session.players.map(stripWS),
        map: session.map,
        story: session.story,
        enemies: session.enemies
      });

      broadcastPlayersList(sid);
      return;
    }

    // -------------------------------------------------------------------------
    // 3) UPDATE PLAYER (HP, Nexus, Stress, etc.)
    // -------------------------------------------------------------------------
   if (type === "playerUpdate") {
  const sid = msg.sessionId;
  const pid = msg.playerId;

  const session = sessions[sid];
  if (!session) return;

  const idx = session.players.findIndex((p) => p.playerId === pid);
  if (idx === -1) return;

  // Merge the incoming player fields, but NEVER overwrite ws
  const existing = session.players[idx];
  session.players[idx] = {
    ...existing,
    ...msg.player,
    ws: existing.ws
  };

  // Update party list for everyone
  broadcastPlayersList(sid);

  // Broadcast the updated player to everyone, stripping ws
  broadcast(session, {
    type: "playerUpdate",
    player: stripWS(session.players[idx]),
    players: session.players.map(stripWS)
  });

  return;
}


    // -------------------------------------------------------------------------
    // 4) DICE ROLL
    // -------------------------------------------------------------------------
    if (type === "rollDice") {
      const { sessionId, playerId, sides, count } = msg;
      const sid = sessionId;
      const c = Math.max(1, count || 1);
      const die = Math.max(2, sides || 6);

      const session = sessions[sid];
      if (!session) return;

      const player = session.players.find((p) => p.playerId === playerId);
      if (!player) return;

      const { rolls, total } = rollDice(c, die);

      broadcast(sid, {
        type: "diceResult",
        playerName: player.name,
        rolls,
        total,
        count: c,
        sides: die
      });

      return;
    }

    // -------------------------------------------------------------------------
    // 5) SKILL USE (PLAYER ABILITIES)
    // -------------------------------------------------------------------------
    if (type === "skillUse") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      broadcast(sid, {
        type: "skillResult",
        playerName: getPlayerName(session, msg.playerId),
        abilityName: msg.abilityName,
        success: msg.success,
        hitRoll: msg.hitRoll,
        totalDamage: msg.totalDamage,
        breakdown: msg.breakdown,
        nexusCost: msg.nexusCost,
        remainingNexus: msg.remainingNexus
      });

      return;
    }

    // -------------------------------------------------------------------------
    // 6) MAP UPDATE
    // -------------------------------------------------------------------------
    if (type === "updateMap") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      session.map = { url: msg.url };

      broadcast(sid, { type: "mapUpdate", map: session.map });
      return;
    }

    // -------------------------------------------------------------------------
    // 7) CONFLICT START/END
    // -------------------------------------------------------------------------
    if (type === "startConflict") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      session.story.activeConflict = { name: msg.name, round: 1 };

      broadcast(sid, { type: "storyUpdate", story: session.story, enemies: session.enemies });
      return;
    }

    if (type === "endConflict") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      session.story.activeConflict = null;

      broadcast(sid, { type: "storyUpdate", story: session.story, enemies: session.enemies });
      return;
    }

    // -------------------------------------------------------------------------
    // 8) ENEMIES — ADD / USE ABILITY / ADJUST / SET / REMOVE
    // -------------------------------------------------------------------------
    if (type === "addEnemy") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      const enemyKey = msg.enemyKey;
      const def = getEnemyDef(enemyKey);

      if (!def) {
        send(ws, { type: "combatLog", entry: { note: `Unknown enemy key: ${enemyKey}` } });
        return;
      }

      const instanceId = "E" + Math.random().toString(36).slice(2);

      const enemy = {
        instanceId,
        key: def.key || enemyKey,
        name: def.name || enemyKey,
        hp: def.maxHp ?? 0,
        maxHp: def.maxHp ?? 0,
        nexus: def.maxNexus ?? 0,
        maxNexus: def.maxNexus ?? 0
      };

      session.enemies.push(enemy);

      broadcast(sid, { type: "enemyState", enemies: session.enemies });
      broadcast(sid, { type: "combatLog", entry: { note: `Enemy added: ${enemy.name}` } });
      return;
    }

    if (type === "enemyAdjust") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      const id = msg.enemyInstanceId;
      const e = session.enemies.find((x) => x.instanceId === id);
      if (!e) return;

      if (typeof msg.hpDelta === "number") {
        e.hp = clamp((e.hp ?? 0) + msg.hpDelta, 0, e.maxHp ?? 999999);
      }
      if (typeof msg.nexusDelta === "number") {
        e.nexus = clamp((e.nexus ?? 0) + msg.nexusDelta, 0, e.maxNexus ?? 999999);
      }

      broadcast(sid, { type: "enemyState", enemies: session.enemies });
      return;
    }

    if (type === "enemySet") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      const id = msg.enemyInstanceId;
      const e = session.enemies.find((x) => x.instanceId === id);
      if (!e) return;

      if (typeof msg.hp === "number") {
        e.hp = clamp(msg.hp, 0, e.maxHp ?? 999999);
      }
      if (typeof msg.nexus === "number") {
        e.nexus = clamp(msg.nexus, 0, e.maxNexus ?? 999999);
      }

      broadcast(sid, { type: "enemyState", enemies: session.enemies });
      return;
    }

    if (type === "removeEnemy") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      const id = msg.enemyInstanceId;
      const enemy = session.enemies.find((e) => e.instanceId === id);
      if (!enemy) return;

      session.enemies = session.enemies.filter((e) => e.instanceId !== id);

      broadcast(sid, { type: "enemyState", enemies: session.enemies });
      broadcast(sid, { type: "combatLog", entry: { note: `💀 ${(enemy.name || enemy.key || "Enemy")} was removed.` } });
      return;
    }

    if (type === "enemyUseAbility") {
      const sid = msg.sessionId;
      const session = sessions[sid];
      if (!session) return;

      const id = msg.enemyInstanceId;
      const abilityId = msg.abilityId;

      const enemy = session.enemies.find((e) => e.instanceId === id);
      if (!enemy) return;

      const def = getEnemyDef(enemy.key);
      if (!def) return;

      const ability = (def.abilities || []).find((a) => a.id === abilityId);
      if (!ability) {
        broadcast(sid, { type: "combatLog", entry: { note: `${enemy.name} tried unknown ability: ${abilityId}` } });
        return;
      }

      // HIT/MISS RULE: odds hit (1,3,5), evens miss (2,4,6)
      const hitRoll = rollSingleDie(6);
      const success = (hitRoll % 2) === 1;

      const cost = ability.cost || 0;

      if (success && cost > (enemy.nexus ?? 0)) {
        broadcast(sid, {
          type: "combatLog",
          entry: {
            sourceName: enemy.name,
            abilityName: ability.name,
            note: `FAILED: not enough Nexus (needs ${cost}, has ${enemy.nexus ?? 0}). Hit roll was ${hitRoll}.`
          }
        });
        return;
      }

      let totalDamage = 0;
      let breakdown = "";

      if (success) {
        if (cost > 0) enemy.nexus = (enemy.nexus ?? 0) - cost;

        if (ability.roll) {
          const dmg = rollFormula(ability.roll);
          totalDamage = dmg.total;
          breakdown = dmg.breakdown;
        } else {
          breakdown = "No damage roll.";
        }
      } else {
        breakdown = `MISS (even roll). Hit roll: ${hitRoll}.`;
      }

      broadcast(sid, {
        type: "combatLog",
        entry: {
          sourceName: enemy.name,
          abilityName: ability.name,
          hitRoll,
          success,
          totalDamage,
          breakdown,
          nexusSpent: success ? cost : 0,
          enemyNexusNow: enemy.nexus
        }
      });

      broadcast(sid, { type: "enemyState", enemies: session.enemies });
      return;
    }

    // If we reached here, unknown message type: ignore safely.
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
