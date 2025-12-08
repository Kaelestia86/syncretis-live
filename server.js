// -----------------------------------------------------------------------------
// Realms of Syncretis – Live Session Server
// -----------------------------------------------------------------------------
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------------------------
// STATIC FILES (SERVE THE UI FROM Public/)
// -----------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

// -----------------------------------------------------------------------------
// SESSION STATE
// -----------------------------------------------------------------------------
const sessions = {}; // { SESSIONID: { players: [], story: {}, map: {} } }

// Simple helper
function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
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
      const sid = sessionId.toUpperCase();

      if (!sessions[sid]) {
        sessions[sid] = {
          players: [],
          story: {},
          map: {}
        };
      }

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

      sessions[sid].players.push(player);

      // Confirm join
      send(ws, {
        type: "sessionJoined",
        sessionId: sid,
        playerId
      });

      // Send session state
      send(ws, {
        type: "sessionState",
        sessionId: sid,
        you: player,
        players: sessions[sid].players.map(stripWS),
        map: sessions[sid].map,
        story: sessions[sid].story
      });

      broadcastPlayersList(sid);
      return;
    }

    // -------------------------------------------------------------------------
    // 2) REJOIN SESSION
    // -------------------------------------------------------------------------
    if (type === "rejoinSession") {
      const sid = msg.sessionId.toUpperCase();
      const pid = msg.playerId;

      const session = sessions[sid];
      if (!session) return;

      const player = session.players.find((p) => p.playerId === pid);
      if (!player) return;

      player.ws = ws; // rebind socket

      send(ws, {
        type: "sessionState",
        sessionId: sid,
        you: player,
        players: session.players.map(stripWS),
        map: session.map,
        story: session.story
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

      // Update player fields (except ws)
      session.players[idx] = {
        ...session.players[idx],
        ...msg.player,
        ws: session.players[idx].ws
      };

      broadcastPlayersList(sid);

      send(session.players[idx].ws, {
        type: "playerUpdate",
        player: session.players[idx],
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

      const rolls = [];
      let total = 0;

      for (let i = 0; i < c; i++) {
        const r = Math.floor(Math.random() * die) + 1;
        rolls.push(r);
        total += r;
      }

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
    // 5) SKILL USE
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
      if (!sessions[sid]) return;

      sessions[sid].map = { url: msg.url };

      broadcast(sid, {
        type: "mapUpdate",
        map: sessions[sid].map
      });

      return;
    }

    // -------------------------------------------------------------------------
    // 7) CONFLICT START/END
    // -------------------------------------------------------------------------
    if (type === "startConflict") {
      const sid = msg.sessionId;
      if (!sessions[sid]) return;

      sessions[sid].story.activeConflict = {
        name: msg.name,
        round: 1
      };

      broadcast(sid, {
        type: "storyUpdate",
        story: sessions[sid].story
      });

      return;
    }

    if (type === "endConflict") {
      const sid = msg.sessionId;
      if (!sessions[sid]) return;

      sessions[sid].story.activeConflict = null;

      broadcast(sid, {
        type: "storyUpdate",
        story: sessions[sid].story
      });

      return;
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
