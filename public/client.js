console.log("Client JS Loaded");

// -----------------------------------------------------------------------------
// GLOBAL STATE
// -----------------------------------------------------------------------------
let socket;
let sessionId = null;
let playerId = null;
let currentPlayer = null;

// Map state (URL or DataURL) for canvas rendering
let currentMapSrc = "";

// Canvas map image + camera state
let mapImage = null;
let mapImageSrcLoaded = "";
let zoom = 1;
let panX = 0;
let panY = 0;

// Token state (client-only for now)
let mapTool = "none"; // "none" | "placeEnemy"
let tokens = [];      // { id, type: "enemy"|"warden", x01, y01, enemyInstanceId?: string }
let selectedTokenId = null;

// When placing a token, link it to this enemy instance (if set)
let pendingEnemyInstanceId = null;


// Drag state
let isDraggingToken = false;
let dragTokenId = null;
let isPanning = false;
let panStart = null;
let spaceDown = false;

// -----------------------------------------------------------------------------
// CLASS ABILITIES & SKILL HELPERS
// -----------------------------------------------------------------------------
const ABILITIES_BY_CLASS = {
  "Talons of Dragoon": [
    { id: "talons_basic", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "talons_harm_strike", name: "Harmonious Strike", desc: "Empowered strike guided by Nexus.", damage: "2d10", nexusCost: 10 },
    { id: "talons_twin_roar", name: "Twin Roar", desc: "Two heavy follow-up strikes.", damage: "2d10+2d10", nexusCost: 10 },
    { id: "talons_dash_attack", name: "Dash Attack", desc: "Dash in, strike, then pull back.", damage: "1d10", nexusCost: 10 },
    { id: "talons_jump_attack", name: "Jump Attack", desc: "Leap into the air and slam down.", damage: "3d10", nexusCost: 10 }
  ],

  "Scales of Dragoon": [
    { id: "scales_basic_melee", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "scales_radiant_lance", name: "Radiant Lance", desc: "Lance of Nexus light in a line.", damage: "1d20", nexusCost: 10 },
    { id: "scales_power_harmony", name: "Power of Harmony", desc: "Empowered strike channelling inner balance.", damage: "2d10", nexusCost: 10 },
    { id: "scales_shield_pulse", name: "Shield Pulse", desc: "Shockwave from your shield.", damage: "2d10", nexusCost: 10 },
    { id: "scales_basic_crossbow", name: "Basic Crossbow Shot", desc: "Simple ranged crossbow shot.", damage: "1d6", nexusCost: 0 },
    { id: "scales_nexus_guidance", name: "Nexus Guidance", desc: "Guided ranged shot that can arc or burst.", damage: "1d20", nexusCost: 10 }
  ],

  "Eyes of Dragoon": [
    { id: "eyes_basic_melee", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "eyes_crippling_strike", name: "Crippling Strike", desc: "Targeted strike to hamper movement.", damage: "2d6", nexusCost: 10 },
    { id: "eyes_quick_strike", name: "Quick Strike", desc: "A flurry of rapid attacks.", damage: "3d6", nexusCost: 10 },
    { id: "eyes_power_harmony", name: "Power of Harmony", desc: "Empowered strike guided by intuition.", damage: "2d10", nexusCost: 10 },
    { id: "eyes_basic_bow", name: "Basic Bow Shot", desc: "Simple arrow shot.", damage: "1d6", nexusCost: 0 },
    { id: "eyes_nexus_guidance", name: "Nexus Guidance", desc: "Empowered arrow shot; Nexus bends its path.", damage: "1d20", nexusCost: 10 }
  ],

  "Tempest Weaver": [
    { id: "tempest_basic_melee", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "tempest_basic_wind", name: "Basic Wind Attack", desc: "Shards of cutting wind.", damage: "2d6", nexusCost: 0 },
    { id: "tempest_healing_breeze", name: "Healing Breeze", desc: "Soothing wind that mends wounds.", damage: "3d10", nexusCost: 10 },
    { id: "tempest_tornado", name: "Tornado", desc: "Swirling winds batter foes in a cone.", damage: "3d6", nexusCost: 10 },
    { id: "tempest_rescue", name: "Rescue", desc: "Redirect an ally to safety.", damage: "0d6", nexusCost: 10 }
  ],

  "Ember Sage": [
    { id: "ember_basic_melee", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "ember_basic_fire", name: "Basic Fire Attack", desc: "Bolts of flame hurled at a foe.", damage: "2d6", nexusCost: 0 },
    { id: "ember_pyro_siphon", name: "Pyro-siphon", desc: "Explosion that feeds on gathered flame.", damage: "3d6", nexusCost: 10 },
    { id: "ember_infernal_shroud", name: "Infernal Shroud", desc: "Fiery aura that burns nearby foes.", damage: "2d6", nexusCost: 10 },
    { id: "ember_soul_fire_link", name: "Soul Fire Link", desc: "Bind ally's strikes with searing soul-flame.", damage: "2d10", nexusCost: 10 }
  ],

  "Heart-Stone": [
    { id: "heart_basic_melee", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "heart_basic_earth", name: "Basic Earth Attack", desc: "Stone shards surge from below.", damage: "2d6", nexusCost: 0 },
    { id: "heart_seismic_tomb", name: "Seismic Tomb", desc: "Crushing tremor that can entomb foes.", damage: "4d6", nexusCost: 10 },
    { id: "heart_spire_strike", name: "Spire Strike", desc: "Jagged stone spikes launch in a line.", damage: "3d6", nexusCost: 10 },
    { id: "heart_shard_barrage", name: "Shard Barrage", desc: "Ring of exploding rock around you.", damage: "4d6", nexusCost: 10 }
  ],

  "Tears": [
    { id: "tears_basic_melee", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "tears_basic_water", name: "Basic Water Attack", desc: "Cutting jets of water.", damage: "2d6", nexusCost: 0 },
    { id: "tears_caustic_spray", name: "Caustic Spray", desc: "Corrosive spray in a cone.", damage: "3d6", nexusCost: 10 },
    { id: "tears_toxin_tide", name: "Toxin Tide", desc: "Wave of poisoned water.", damage: "2d6", nexusCost: 10 },
    { id: "tears_viscous_wave", name: "Viscous Wave", desc: "Choking, slowing wave that lingers.", damage: "1d6", nexusCost: 10 }
  ],

  "Eclipsar": [
    { id: "eclipsar_basic_melee", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "eclipsar_basic_shadow", name: "Basic Shadow Attack", desc: "Blades of condensed shadow.", damage: "2d6", nexusCost: 0 },
    { id: "eclipsar_sanguine_transfer", name: "Sanguine Transfer", desc: "Drain your own lifeblood to heal another.", damage: "3d6", nexusCost: 10 },
    { id: "eclipsar_wither_and_mend", name: "Wither and Mend", desc: "Wither a foe while mending an ally.", damage: "3d6", nexusCost: 10 },
    { id: "eclipsar_oblivion_veil", name: "Oblivion Veil", desc: "Veil damage now, unleash it later.", damage: "3d6", nexusCost: 10 }
  ],

  "Shadow Weaver": [
    { id: "shadow_basic_dagger", name: "Basic Dagger Attack", desc: "Quick dagger strike from the dark.", damage: "1d10", nexusCost: 0 },
    { id: "shadow_kusari_strike", name: "Ku-sari Strike", desc: "Hooking chain strike.", damage: "1d6", nexusCost: 0 },
    { id: "shadow_dagger_combo", name: "Dagger Combo", desc: "Two precise dagger blows.", damage: "2d10", nexusCost: 10 },
    { id: "shadow_veil_step", name: "Veil Step", desc: "Fade into shadow and reposition.", damage: "0d6", nexusCost: 10 },
    { id: "shadow_kusari_pull", name: "Ku-sari Pull", desc: "Yank a foe closer with a spiked chain.", damage: "3d6", nexusCost: 10 }
  ],

  "Rhythm of Dragoon": [
    { id: "rhythm_basic_melee", name: "Basic Swing", desc: "Standard melee weapon attack.", damage: "1d10", nexusCost: 0 },
    { id: "rhythm_dissonant_chord", name: "Dissonant Chord", desc: "Soundwave attack that damages and disorients.", damage: "3d6", nexusCost: 10 },
    { id: "rhythm_euphoric_melody", name: "Euphoric Melody", desc: "Inspires allies for 2 turns. Roll 1d20 for effectiveness.", damage: "1d20", nexusCost: 10 },
    { id: "rhythm_crippling_strike", name: "Crippling Strike", desc: "A quick precise dagger attack that gives the ability to retreat up to 10 ft.", damage: "2d6", nexusCost: 10 },
    { id: "rhythm_blessing_of_syncretis", name: "Blessing of Syncretis", desc: "Allies gain +2 to attack; roll 5d10 as a potency check.", damage: "5d10", nexusCost: 20 }
  ]
};

// -----------------------------------------------------------------------------
// ABILITY LOOKUP (SAFE, FUZZY BY CLASS NAME)
// -----------------------------------------------------------------------------
function getAbilitiesForClass(className) {
  if (!className) return [];

  if (ABILITIES_BY_CLASS[className]) return ABILITIES_BY_CLASS[className];

  const normalized = className.trim().toLowerCase();

  for (const key of Object.keys(ABILITIES_BY_CLASS)) {
    if (key.toLowerCase() === normalized) return ABILITIES_BY_CLASS[key];
  }

  for (const key of Object.keys(ABILITIES_BY_CLASS)) {
    const keyNorm = key.toLowerCase();
    if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) {
      return ABILITIES_BY_CLASS[key];
    }
  }

  return [];
}

// -----------------------------------------------------------------------------
// DICE HELPERS
// -----------------------------------------------------------------------------
function rollSingleDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(num, sides) {
  let total = 0;
  const rolls = [];
  for (let i = 0; i < num; i++) {
    const r = rollSingleDie(sides);
    rolls.push(r);
    total += r;
  }
  return { total, rolls };
}

function rollDamageFormula(formula) {
  const clean = String(formula || "").trim();
  if (!clean || clean === "0" || clean === "0d6" || clean === "0d0" || clean === "—") {
    return { total: 0, breakdown: "No damage dice." };
  }

  const parts = clean.split("+");
  let total = 0;
  const breakdowns = [];

  for (const partRaw of parts) {
    const part = partRaw.trim();
    if (!part) continue;

    const match = part.match(/(\d+)d(\d+)/i);
    if (!match) continue;

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const { total: subtotal, rolls } = rollDice(count, sides);
    total += subtotal;
    breakdowns.push(`${count}d${sides}: [${rolls.join(", ")}] => ${subtotal}`);
  }

  return { total, breakdown: breakdowns.join(" | ") };
}

// -----------------------------------------------------------------------------
// WEBSOCKET + MESSAGE HANDLING
// -----------------------------------------------------------------------------
function connectWebSocket() {
  const wsUrl =
    (window.location.protocol === "https:" ? "wss://" : "ws://") +
    window.location.host +
    "/ws";

  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {
    console.log("WebSocket connected");
  });

  socket.addEventListener("message", (event) => {
    console.log("WS MESSAGE:", event.data);
    const msg = JSON.parse(event.data);
    const type = msg.type;

    if (type === "sessionState") {
      sessionId = msg.sessionId;
      playerId = msg.you?.playerId || msg.playerId;

      localStorage.setItem("sessionId", sessionId);
      if (playerId) localStorage.setItem("playerId", playerId);

      const connectSection = document.getElementById("connectSection");
      const mainNav = document.getElementById("mainNav");
      if (connectSection) connectSection.classList.add("hidden");
      if (mainNav) mainNav.classList.remove("hidden");
      showTab("playerTab");

      currentPlayer = msg.you;
      updatePlayerInfo(currentPlayer);
      renderSkillsForPlayer(currentPlayer);

      if (Array.isArray(msg.players)) renderPlayersList(msg.players, playerId);

      if (msg.map && msg.map.url) {
        currentMapSrc = msg.map.url;
        renderMap(currentMapSrc);
      } else {
        renderMap();
      }

      if (msg.story) updateStory(msg.story);

      if (Array.isArray(msg.enemies)) renderEnemies(msg.enemies);
    }

    else if (type === "sessionJoined") {
      sessionId = msg.sessionId;
      playerId = msg.playerId;
      localStorage.setItem("sessionId", sessionId);
      localStorage.setItem("playerId", playerId);
    }

    else if (type === "playerUpdate") {
      if (msg.player && msg.player.playerId === playerId) {
        currentPlayer = msg.player;
        updatePlayerInfo(currentPlayer);
        renderSkillsForPlayer(currentPlayer);
      }
      if (Array.isArray(msg.players)) renderPlayersList(msg.players, playerId);
    }

    else if (type === "playersList") {
      renderPlayersList(msg.players || [], playerId);
    }

    else if (type === "diceResult") {
      showDiceResult(msg);
    }

    else if (type === "mapUpdate") {
      if (msg.map && msg.map.url) {
        currentMapSrc = msg.map.url;
        renderMap(currentMapSrc);
      }
    }

    else if (type === "storyUpdate") {
      updateStory(msg.story);
      if (Array.isArray(msg.enemies)) renderEnemies(msg.enemies);
    }

    else if (type === "skillResult") {
      showSkillResult(msg);
    }

    else if (type === "enemyState") {
      if (Array.isArray(msg.enemies)) renderEnemies(msg.enemies);
    }

    else if (type === "combatLog") {
      appendCombatLog(msg.entry);
    }
  });

  socket.addEventListener("close", () => {
    console.warn("WebSocket closed, attempting reconnect in 3s...");
    setTimeout(connectWebSocket, 3000);
  });
}

function sendMsg(obj) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("Tried to send over a closed socket:", obj);
    return;
  }
  socket.send(JSON.stringify(obj));
}

connectWebSocket();

window.addEventListener("DOMContentLoaded", () => {
  renderEnemySelect();
  renderMonsterIndex();
});

function renderEnemySelect() {
  const sel = document.getElementById("enemySelect");
  if (!sel) return;

  const defs = window.ENEMY_DEFS || {};
  const keys = Object.keys(defs);

  // Always reset
  sel.innerHTML = "";

  // Default placeholder option
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = keys.length ? "-- Select Enemy --" : "No enemies loaded";
  sel.appendChild(placeholder);

  if (!keys.length) return;

  keys.sort((a, b) => {
    const an = (defs[a]?.name || a).toLowerCase();
    const bn = (defs[b]?.name || b).toLowerCase();
    return an.localeCompare(bn);
  });

  for (const key of keys) {
    const def = defs[key] || {};
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${def.name || key} (${key})`;
    sel.appendChild(opt);
  }
}
function renderMonsterIndex() {
  // IMPORTANT: this must match the id you added in index.html
  // (I’m assuming you created: <div id="monsterIndex"></div>)
  const host = document.getElementById("monsterIndex");
  if (!host) return;

  const defs = window.ENEMY_DEFS || {};
  const keys = Object.keys(defs);

  host.innerHTML = "";

  if (!keys.length) {
    host.innerHTML = `<div style="opacity:.8">No monsters loaded (enemy_defs.js missing or empty).</div>`;
    return;
  }

  // Sort by display name
  keys.sort((a, b) => {
    const an = (defs[a]?.name || a).toLowerCase();
    const bn = (defs[b]?.name || b).toLowerCase();
    return an.localeCompare(bn);
  });

  // Build cards
  for (const key of keys) {
    const def = defs[key] || {};
    const name = def.name || key;

    const card = document.createElement("details");
    card.className = "monster-card";
    card.open = false;

    const summary = document.createElement("summary");
    summary.className = "monster-card__summary";

    const left = document.createElement("div");
    left.className = "monster-card__title";
    left.innerHTML = `<strong>${escapeHtml(name)}</strong> <span class="monster-card__key">(${escapeHtml(key)})</span>`;

    const right = document.createElement("div");
    right.className = "monster-card__actions";

    const spawnBtn = document.createElement("button");
    spawnBtn.type = "button";
    spawnBtn.className = "monster-spawn-btn";
    spawnBtn.textContent = "Spawn";

    // This uses your existing add-enemy pathway:
    spawnBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent("ros:addEnemy", { detail: { enemyKey: key } }));
    });

    right.appendChild(spawnBtn);
    summary.appendChild(left);
    summary.appendChild(right);

    const body = document.createElement("div");
    body.className = "monster-card__body";

    const desc = def.desc || def.description || "";
    const hp = def.hp ?? def.maxHp ?? "";
    const nexus = def.nexus ?? def.maxNexus ?? "";
    const stress = def.stress ?? "";

    body.innerHTML = `
      ${desc ? `<div class="monster-card__desc">${escapeHtml(desc)}</div>` : ""}

      <div class="monster-card__meta">
        ${hp !== "" ? `<div><strong>HP</strong>: ${escapeHtml(String(hp))}</div>` : ""}
        ${nexus !== "" ? `<div><strong>Nexus</strong>: ${escapeHtml(String(nexus))}</div>` : ""}
        ${stress !== "" ? `<div><strong>Stress</strong>: ${escapeHtml(String(stress))}</div>` : ""}
      </div>
    `;

    card.appendChild(summary);
    card.appendChild(body);
    host.appendChild(card);
  }
}

// Tiny safety helper so monster text can’t break your HTML
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// -----------------------------------------------------------------------------
// JOIN / REJOIN
// -----------------------------------------------------------------------------
const joinBtnEl = document.getElementById("joinBtn");
if (joinBtnEl) {
  joinBtnEl.addEventListener("click", () => {
    const rawId = document.getElementById("sessionIdInput")?.value?.trim() || "";
    const name = document.getElementById("playerNameInput")?.value?.trim() || "";
    const race = document.getElementById("raceSelect")?.value?.trim() || "";
    const className = document.getElementById("classSelect")?.value?.trim() || "";
    const isSw = document.getElementById("isSwCheckbox")?.checked || false;

    if (!rawId || !name) {
      alert("Enter session ID and name.");
      return;
    }

    sessionId = rawId.toUpperCase();

    sendMsg({
      type: "joinSession",
      sessionId,
      playerName: name,
      role: isSw ? "storyWeaver" : "player",
      race,
      className
    });
  });
}

const rejoinBtnEl = document.getElementById("rejoinBtn");
if (rejoinBtnEl) {
  rejoinBtnEl.addEventListener("click", () => {
    const savedId = localStorage.getItem("sessionId");
    const savedPlayer = localStorage.getItem("playerId");

    if (!savedId || !savedPlayer) {
      alert("No saved session found.");
      return;
    }

    sendMsg({
      type: "rejoinSession",
      sessionId: savedId.toUpperCase(),
      playerId: savedPlayer
    });
  });
}

// -----------------------------------------------------------------------------
// TABS
// -----------------------------------------------------------------------------
function showTab(tabId) {
  document.querySelectorAll(".tab").forEach((el) => el.classList.add("hidden"));

  const tabEl = document.getElementById(tabId);
  if (tabEl) tabEl.classList.remove("hidden");

  const swBtn = document.getElementById("swTabButton");
  if (swBtn) {
    if (tabId === "storyWeaverTab") swBtn.classList.add("active-tab");
    else swBtn.classList.remove("active-tab");
  }
}

const mainNavEl = document.getElementById("mainNav");
if (mainNavEl) {
  mainNavEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    const targetTab = btn.getAttribute("data-tab");
    showTab(targetTab);
  });
}

// -----------------------------------------------------------------------------
// MAP HELPERS (CONTAIN DRAW + COORDINATE CONVERSIONS)
// -----------------------------------------------------------------------------
function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function makeId() {
  return `t_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function highlightEnemyCard(enemyInstanceId, opts = {}) {

  // Clear existing highlights
  document
    .querySelectorAll(".enemy-card.highlighted")
    .forEach(el => el.classList.remove("highlighted"));

  if (!enemyInstanceId) return;

  const card = document.querySelector(
    `.enemy-card[data-enemy-instance-id="${enemyInstanceId}"]`
  );
  if (!card) return;

  card.classList.add("highlighted");
  card.open = true;

 const shouldScroll = opts.scroll !== false;

if (shouldScroll) {
  card.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}
}

function getContainRect(imgW, imgH, canvasW, canvasH) {
  const scale = Math.min(canvasW / imgW, canvasH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const drawX = (canvasW - drawW) / 2;
  const drawY = (canvasH - drawH) / 2;
  return { x: drawX, y: drawY, w: drawW, h: drawH };
}

function canvasPointFromEvent(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  return { x, y };
}

function screenToWorld(pt) {
  return {
    x: (pt.x - panX) / zoom,
    y: (pt.y - panY) / zoom
  };
}

function worldToScreen(pt) {
  return {
    x: pt.x * zoom + panX,
    y: pt.y * zoom + panY
  };
}

function tokenWorldPosition(token, mapRect) {
  const x = mapRect.x + token.x01 * mapRect.w;
  const y = mapRect.y + token.y01 * mapRect.h;
  return { x, y };
}

function findTokenAtWorld(worldPt, mapRect) {
  // pick radius in world units (so zoom doesn't change selection feel)
  const pickR = 14 / zoom;
  let best = null;
  let bestD2 = Infinity;

  for (const t of tokens) {
    const tp = tokenWorldPosition(t, mapRect);
    const dx = tp.x - worldPt.x;
    const dy = tp.y - worldPt.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= pickR * pickR && d2 < bestD2) {
      best = t;
      bestD2 = d2;
    }
  }
  return best;
}
function focusEnemyToken(enemyInstanceId) {
  if (!enemyInstanceId) return;

  const canvas = document.getElementById("mapCanvas");
  if (!canvas || !mapImage) return;

  // Find the first enemy token linked to this enemy instance
  const t = tokens.find(tok => tok.type === "enemy" && tok.enemyInstanceId === enemyInstanceId);
  if (!t) return;

  // Compute map rect in WORLD space for current zoom
  const mapRect = getContainRect(
    mapImage.naturalWidth,
    mapImage.naturalHeight,
    canvas.width / zoom,
    canvas.height / zoom
  );

  // Token world position
  const tp = tokenWorldPosition(t, mapRect);

  // Center token on screen
  const centerScreenX = canvas.width / 2;
  const centerScreenY = canvas.height / 2;

  panX = centerScreenX - (tp.x * zoom);
  panY = centerScreenY - (tp.y * zoom);

  selectedTokenId = t.id;
  drawCanvasMap();
}

function drawToken(ctx, t, mapRect) {
  const tp = tokenWorldPosition(t, mapRect);

  ctx.save();
  ctx.beginPath();
  ctx.arc(tp.x, tp.y, 10 / zoom, 0, Math.PI * 2);

  // Enemy vs Warden visual differentiation
  if (t.type === "warden") ctx.fillStyle = "#4a79d8"; // blue
  else ctx.fillStyle = "#d84a4a"; // red

  ctx.fill();

  // outline
  ctx.lineWidth = 2 / zoom;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.stroke();

  // selected highlight
  if (t.id === selectedTokenId) {
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, 14 / zoom, 0, Math.PI * 2);
    ctx.lineWidth = 3 / zoom;
    ctx.strokeStyle = "rgba(255,215,0,0.95)";
    ctx.stroke();
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// MAP RENDER (CANVAS) + CAMERA
// -----------------------------------------------------------------------------
function drawCanvasMap() {
  const canvas = document.getElementById("mapCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply camera
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  const worldW = canvas.width;
  const worldH = canvas.height;

  if (!mapImage) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "16px sans-serif";
    ctx.fillText("No map selected.", 20 / zoom, 40 / zoom);
    ctx.restore();
    return;
  }

  const mapRect = getContainRect(mapImage.naturalWidth, mapImage.naturalHeight, worldW / zoom, worldH / zoom);
  ctx.drawImage(mapImage, mapRect.x, mapRect.y, mapRect.w, mapRect.h);

  // tokens
  for (const t of tokens) drawToken(ctx, t, mapRect);

  ctx.restore();

  // tool hint (UI-only)
  if (mapTool === "placeEnemy") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "14px sans-serif";
    ctx.fillText("Placing tokens: click to place (Shift=warden). Click token to select, drag to move.", 12, canvas.height - 14);
  }
}

function resetCamera() {
  zoom = 1;
  panX = 0;
  panY = 0;
}

function renderMap(url) {
  const src = (url && String(url).trim()) ? String(url).trim() : currentMapSrc;
  if (src) currentMapSrc = src;

  const canvas = document.getElementById("mapCanvas");
  if (!canvas) return;

  if (!src) {
    mapImage = null;
    mapImageSrcLoaded = "";
    resetCamera();
    drawCanvasMap();
    return;
  }

  // If we already loaded this exact src, just redraw (fast, avoids disappearing)
  if (mapImage && mapImageSrcLoaded === src) {
    drawCanvasMap();
    return;
  }

  const img = new Image();
  img.onload = () => {
    mapImage = img;
    mapImageSrcLoaded = src;
    resetCamera();
    drawCanvasMap();
  };
  img.onerror = () => {
    console.error("Failed to load map image:", src);
    mapImage = null;
    mapImageSrcLoaded = "";
    drawCanvasMap();
  };
  img.src = src;
}

// -----------------------------------------------------------------------------
// MAP CONTROLS (SET URL + UPLOAD)
// -----------------------------------------------------------------------------
const setMapBtn = document.getElementById("setMapBtn");
if (setMapBtn) {
  setMapBtn.addEventListener("click", () => {
    const input = document.getElementById("mapUrlInput");
    const url = input ? input.value.trim() : "";
    if (!sessionId) return;

    currentMapSrc = url;
    sendMsg({ type: "updateMap", sessionId, url });
  });
}

const mapUpload = document.getElementById("mapUpload");
if (mapUpload) {
  mapUpload.addEventListener("change", () => {
    const file = mapUpload.files?.[0];
    if (!file) return;

    if (!sessionId) {
      alert("Join a session first.");
      mapUpload.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      currentMapSrc = dataUrl;
      sendMsg({ type: "updateMap", sessionId, url: dataUrl });
      mapUpload.value = "";
    };
    reader.readAsDataURL(file);
  });
}

// -----------------------------------------------------------------------------
// MAP INTERACTION: ZOOM/PAN + TOKENS (MOVE/DELETE)
// -----------------------------------------------------------------------------
(function enableCanvasMapControls() {
  const canvas = document.getElementById("mapCanvas");
  if (!canvas) return;

  // Space to pan (nice for trackpads)
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") spaceDown = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") spaceDown = false;
  });

  // Wheel zoom (zoom towards cursor)
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const pt = canvasPointFromEvent(canvas, e);
    const before = screenToWorld(pt);

    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.max(0.5, Math.min(3, zoom * factor));
    if (nextZoom === zoom) return;

    zoom = nextZoom;

    // Keep cursor anchored
    const afterScreen = worldToScreen(before);
    panX += (pt.x - afterScreen.x);
    panY += (pt.y - afterScreen.y);

    drawCanvasMap();
  }, { passive: false });

  // Pointer logic: select/drag tokens, or pan, or place tokens
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture?.(e.pointerId);

    const pt = canvasPointFromEvent(canvas, e);
    const world = screenToWorld(pt);

    const mapRect = (mapImage)
      ? getContainRect(mapImage.naturalWidth, mapImage.naturalHeight, canvas.width / zoom, canvas.height / zoom)
      : null;

    // Middle mouse OR space+left pans
    const wantsPan = (e.button === 1) || (spaceDown && e.button === 0);
    if (wantsPan) {
      isPanning = true;
      panStart = { x: pt.x, y: pt.y, panX, panY };
      return;
    }

    // If we have a map, allow token selection/move
    if (mapRect) {
      const hit = findTokenAtWorld(world, mapRect);
      if (hit) {
        selectedTokenId = hit.id;

        if (hit.type === "enemy") highlightEnemyCard(hit.enemyInstanceId, { scroll: false });


        isDraggingToken = true;
        dragTokenId = hit.id;
        drawCanvasMap();
        return;
      }
    }

    // Otherwise, if in place mode, place new token
    if (mapTool === "placeEnemy" && mapRect && mapImage) {
      // only place if click is inside the map area (not letterbox)
      if (world.x >= mapRect.x && world.x <= mapRect.x + mapRect.w &&
          world.y >= mapRect.y && world.y <= mapRect.y + mapRect.h) {

        const x01 = clamp01((world.x - mapRect.x) / mapRect.w);
        const y01 = clamp01((world.y - mapRect.y) / mapRect.h);

        const type = e.shiftKey ? "warden" : "enemy";
        const t = {
       id: makeId(),
  type,
  x01,
  y01,
  enemyInstanceId: type === "enemy" ? pendingEnemyInstanceId : null
};

        tokens.push(t);
pendingEnemyInstanceId = null;
selectedTokenId = t.id;

        drawCanvasMap();
      }
      return;
    }

    // Clicking empty space clears selection
    selectedTokenId = null;
    drawCanvasMap();
  });

  canvas.addEventListener("pointermove", (e) => {
    const pt = canvasPointFromEvent(canvas, e);

    if (isPanning && panStart) {
      panX = panStart.panX + (pt.x - panStart.x);
      panY = panStart.panY + (pt.y - panStart.y);
      drawCanvasMap();
      return;
    }

    if (!isDraggingToken || !dragTokenId || !mapImage) return;

    const world = screenToWorld(pt);
    const mapRect = getContainRect(mapImage.naturalWidth, mapImage.naturalHeight, canvas.width / zoom, canvas.height / zoom);

    const t = tokens.find(x => x.id === dragTokenId);
    if (!t) return;

    const x01 = clamp01((world.x - mapRect.x) / mapRect.w);
    const y01 = clamp01((world.y - mapRect.y) / mapRect.h);
    t.x01 = x01;
    t.y01 = y01;

    drawCanvasMap();
  });

  canvas.addEventListener("pointerup", () => {
    isDraggingToken = false;
    dragTokenId = null;
    isPanning = false;
    panStart = null;
  });
})();

// Button: place enemy token mode
const addEnemyTokenBtn = document.getElementById("addEnemyTokenBtn");
if (addEnemyTokenBtn) {
  addEnemyTokenBtn.addEventListener("click", () => {
    mapTool = (mapTool === "placeEnemy") ? "none" : "placeEnemy";
    drawCanvasMap();
  });
}

// Button: delete selected token
const deleteSelectedTokenBtn = document.getElementById("deleteSelectedTokenBtn");
if (deleteSelectedTokenBtn) {
  deleteSelectedTokenBtn.addEventListener("click", () => {
    if (!selectedTokenId) return;

    tokens = tokens.filter(t => t.id !== selectedTokenId);
    selectedTokenId = null;

    drawCanvasMap();
  });
}

// -----------------------------------------------------------------------------
// STORY / CONFLICT
// -----------------------------------------------------------------------------
function updateStory(story) {
  const conflictInfoDiv = document.getElementById("conflictInfo");
  if (!conflictInfoDiv) return;

  if (!story || !story.activeConflict) {
    conflictInfoDiv.textContent = "No active conflict.";
  } else {
    const { name, round } = story.activeConflict;
    conflictInfoDiv.textContent = `Conflict: ${name} (Round ${round || 1})`;
  }
}

const startConflictBtnEl = document.getElementById("startConflictBtn");
if (startConflictBtnEl) {
  startConflictBtnEl.addEventListener("click", () => {
    const nameInput = document.getElementById("conflictNameInput");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!sessionId) return;
    sendMsg({
      type: "startConflict",
      sessionId,
      name: name || "Unnamed Conflict"
    });
  });
}

const endConflictBtnEl = document.getElementById("endConflictBtn");
if (endConflictBtnEl) {
  endConflictBtnEl.addEventListener("click", () => {
    if (!sessionId) return;
    sendMsg({ type: "endConflict", sessionId });
  });
}
// Add Enemy button (Conflict Management)
const addEnemyBtnEl = document.getElementById("addEnemyBtn");
if (addEnemyBtnEl) {
  addEnemyBtnEl.addEventListener("click", () => {
    const sel = document.getElementById("enemySelect");
    const enemyKey = sel ? sel.value : "";

    if (!enemyKey) {
      alert("Pick an enemy first.");
      return;
    }

    // Use your existing add-enemy pathway (already listens for this)
    window.dispatchEvent(new CustomEvent("ros:addEnemy", { detail: { enemyKey } }));
  });
}

// -----------------------------------------------------------------------------
// STRESS BAR RENDERING (0–10)
// -----------------------------------------------------------------------------
function renderStressBar(value) {
  const el = document.getElementById("stressBar");
  if (!el) return;

  const v = Math.max(0, Math.min(10, Number(value) || 0));
  el.innerHTML = "";

  for (let i = 1; i <= 10; i++) {
    const pip = document.createElement("span");
    pip.className = "stress-pip" + (i <= v ? " filled" : "");
    el.appendChild(pip);
  }
}

function setMeterFill(fillEl, current, max) {
  if (!fillEl) return;

  const c = Number(current) || 0;
  const m = Math.max(1, Number(max) || 1);
  const pct = Math.max(0, Math.min(100, (c / m) * 100));

  fillEl.style.width = pct + "%";
}

function renderEnemyStressBar(hostEl, value) {
  if (!hostEl) return;

  const v = Math.max(0, Math.min(10, Number(value) || 0));
  hostEl.innerHTML = "";

  for (let i = 1; i <= 10; i++) {
    const pip = document.createElement("span");
    pip.className = "stress-pip" + (i <= v ? " filled" : "");
    hostEl.appendChild(pip);
  }
}


// -----------------------------------------------------------------------------
// PLAYER STATS (NEXUS, STRESS, LEVEL, HP MANAGEMENT)
// -----------------------------------------------------------------------------
function updatePlayerInfo(player) {
  const hpFill = document.getElementById("hpFill");
  const nexusFill = document.getElementById("nexusFill");

  if (!player) return;
  currentPlayer = player;

  const nameEl = document.getElementById("playerNameDisplay");
  const raceEl = document.getElementById("playerRaceDisplay");
  const classEl = document.getElementById("playerClassDisplay");
  const hpEl = document.getElementById("hpDisplay");
  const lvlEl = document.getElementById("levelDisplay");
  const nexusVal = document.getElementById("nexusValue");
  const maxNexusVal = document.getElementById("maxNexusValue");

  if (nameEl) nameEl.textContent = player.name || "-";
  if (raceEl) raceEl.textContent = player.race || "-";
  if (classEl) classEl.textContent = player.className || "-";
  if (hpEl) hpEl.textContent = `${player.currentHp} / ${player.maxHp}`;
  if (lvlEl) lvlEl.textContent = player.level || 1;
  if (nexusVal) nexusVal.textContent = player.nexus ?? player.maxNexus ?? 40;
  if (maxNexusVal) maxNexusVal.textContent = player.maxNexus ?? 40;

  // Stress pips
  renderStressBar(player.stress ?? 0);

  // HP & Nexus bars
  setMeterFill(hpFill, player.currentHp, player.maxHp);
  setMeterFill(
    nexusFill,
    player.nexus ?? player.maxNexus ?? 40,
    player.maxNexus ?? 40
  );
}

function syncPlayerUpdate() {
  if (!sessionId || !playerId || !currentPlayer) return;
  sendMsg({
    type: "playerUpdate",
    sessionId,
    playerId,
    player: currentPlayer
  });
}

function changeNexus(delta) {
  if (!currentPlayer) return;
  const maxNexus = currentPlayer.maxNexus ?? 40;
  let newVal = (currentPlayer.nexus ?? maxNexus) + delta;
  newVal = Math.max(0, Math.min(maxNexus, newVal));
  currentPlayer.nexus = newVal;
  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
}

function resetNexus() {
  if (!currentPlayer) return;
  currentPlayer.nexus = currentPlayer.maxNexus ?? 40;
  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
}

function changeStress(delta) {
  console.log("changeStress fired:", delta, "currentPlayer:", currentPlayer);
  if (!currentPlayer) return;

  const maxStress = 10;
  let newVal = (currentPlayer.stress ?? 0) + delta;
  newVal = Math.max(0, Math.min(maxStress, newVal));
  currentPlayer.stress = newVal;

  console.log("Stress now:", currentPlayer.stress);

  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
}

function resetStress() {
  if (!currentPlayer) return;
  currentPlayer.stress = 0;
  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
}

function changeHp(delta) {
  if (!currentPlayer) return;
  const maxHp = currentPlayer.maxHp ?? 0;
  let newVal = (currentPlayer.currentHp ?? maxHp) + delta;
  newVal = Math.max(0, Math.min(maxHp, newVal));
  currentPlayer.currentHp = newVal;
  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
}

function healToFull() {
  if (!currentPlayer) return;
  currentPlayer.currentHp = currentPlayer.maxHp ?? currentPlayer.currentHp ?? 0;
  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
}

window.changeNexus = changeNexus;
window.resetNexus = resetNexus;
window.changeStress = changeStress;
window.resetStress = resetStress;
window.changeHp = changeHp;
window.healToFull = healToFull;

// -----------------------------------------------------------------------------
// QUICK DELTA BUTTONS (NO MORE JS EDITS LATER)
// Add buttons like: <button data-hp-delta="-1">HP -1</button>
// -----------------------------------------------------------------------------
(function wireDeltaButtons() {
  document.addEventListener("click", (e) => {
    const hpBtn = e.target.closest("[data-hp-delta]");
    if (hpBtn) {
      const delta = parseInt(hpBtn.getAttribute("data-hp-delta"), 10);
      if (!Number.isNaN(delta)) changeHp(delta);
      return;
    }

    const nxBtn = e.target.closest("[data-nexus-delta]");
    if (nxBtn) {
      const delta = parseInt(nxBtn.getAttribute("data-nexus-delta"), 10);
      if (!Number.isNaN(delta)) changeNexus(delta);
      return;
    }

    const stBtn = e.target.closest("[data-stress-delta]");
    if (stBtn) {
      const delta = parseInt(stBtn.getAttribute("data-stress-delta"), 10);
      if (!Number.isNaN(delta)) changeStress(delta);
      return;
    }
  });
})();

// -----------------------------------------------------------------------------
// LEVEL UP/DOWN
// -----------------------------------------------------------------------------
function levelUp() {
  if (!currentPlayer) return;

  if (typeof currentPlayer.level !== "number") currentPlayer.level = 1;
  if (typeof currentPlayer.maxHp !== "number") currentPlayer.maxHp = 10;
  if (typeof currentPlayer.currentHp !== "number") currentPlayer.currentHp = currentPlayer.maxHp;

  if (!Array.isArray(currentPlayer.levelHistory)) currentPlayer.levelHistory = [];

  const roll = rollDice(3, 6);
  const gained = roll.total;

  currentPlayer.level += 1;
  currentPlayer.maxHp += gained;
  currentPlayer.currentHp = currentPlayer.maxHp;

  currentPlayer.levelHistory.push({ hpGained: gained });

  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();

  alert("Level up! You gained " + gained + " HP (3d6).");
}

function levelDown() {
  if (!currentPlayer) return;

  const lvl = (typeof currentPlayer.level === "number") ? currentPlayer.level : 1;
  if (lvl <= 1) {
    alert("You are already level 1.");
    return;
  }

  if (!Array.isArray(currentPlayer.levelHistory) || currentPlayer.levelHistory.length === 0) {
    currentPlayer.level = Math.max(1, lvl - 1);
    updatePlayerInfo(currentPlayer);
    syncPlayerUpdate();
    alert("Level down: no undo history found for HP, so only level was reduced.");
    return;
  }

  const last = currentPlayer.levelHistory.pop();
  const hpGained = Number(last?.hpGained || 0);

  currentPlayer.level = Math.max(1, lvl - 1);

  if (typeof currentPlayer.maxHp !== "number") currentPlayer.maxHp = 10;
  currentPlayer.maxHp = Math.max(1, currentPlayer.maxHp - hpGained);

  if (typeof currentPlayer.currentHp !== "number") currentPlayer.currentHp = currentPlayer.maxHp;
  currentPlayer.currentHp = Math.min(currentPlayer.currentHp, currentPlayer.maxHp);

  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();

  alert("Level down! Undid " + hpGained + " HP from the last level up.");
}

const levelUpBtn = document.getElementById("levelUpBtn");
if (levelUpBtn) levelUpBtn.addEventListener("click", levelUp);

const levelDownBtn = document.getElementById("levelDownBtn");
if (levelDownBtn) levelDownBtn.addEventListener("click", levelDown);


// -----------------------------------------------------------------------------
// ENEMY LEVEL UP/DOWN (Story Weaver)
// - Mirrors the player level system (3d6 HP on level up, undo last on down)
// - Best-effort sync to server via enemyAdjust (hpDelta/maxHpDelta/levelDelta if supported)
// - Also keeps a local override so the Story Weaver UI remains stable even if the server
//   does not yet persist these extra fields.
// -----------------------------------------------------------------------------
const enemyOverrides = new Map(); // key: enemyInstanceId -> override object

function getEnemyOverride(instanceId) {
  if (!instanceId) return null;
  return enemyOverrides.get(instanceId) || null;
}

function setEnemyOverride(instanceId, patch) {
  if (!instanceId) return;
  const prev = enemyOverrides.get(instanceId) || {};
  enemyOverrides.set(instanceId, { ...prev, ...patch });
}

function applyEnemyOverrides(enemy) {
  if (!enemy || !enemy.instanceId) return enemy;
  const ov = getEnemyOverride(enemy.instanceId);
  if (!ov) return enemy;
  return { ...enemy, ...ov };
}

function enemyLevelUp(enemy) {
  if (!enemy || !enemy.instanceId) return;

  const merged = applyEnemyOverrides(enemy);

  const level = (typeof merged.level === "number") ? merged.level : 1;
  const maxHp = (typeof merged.maxHp === "number")
    ? merged.maxHp
    : (typeof merged.hp === "number" ? merged.hp : 10);

  const history = Array.isArray(merged.levelHistory) ? [...merged.levelHistory] : [];

  const roll = rollDice(3, 6);
  const gained = roll.total;

  const nextLevel = level + 1;
  const nextMaxHp = maxHp + gained;

  history.push({ hpGained: gained });

  // Local override so SW sees it immediately
  setEnemyOverride(merged.instanceId, {
    level: nextLevel,
    maxHp: nextMaxHp,
    hp: nextMaxHp, // heal to full on level up
    levelHistory: history
  });

  // Best-effort server sync (safe if server ignores unknown fields)
  if (sessionId) {
    sendMsg({
      type: "enemyAdjust",
      sessionId,
      enemyInstanceId: merged.instanceId,
      hpDelta: gained,
      maxHpDelta: gained,
      levelDelta: +1,
      setHpToMax: true,
      levelHistoryAppend: { hpGained: gained }
    });
  }

  renderEnemies(lastEnemiesState || []);
  alert(`${merged.name || window.ENEMY_DEFS?.[merged.key]?.name || "Enemy"} leveled up! +${gained} HP (3d6).`);
}

function enemyLevelDown(enemy) {
  if (!enemy || !enemy.instanceId) return;

  const merged = applyEnemyOverrides(enemy);

  const level = (typeof merged.level === "number") ? merged.level : 1;
  if (level <= 1) {
    alert("Enemy is already level 1.");
    return;
  }

  const maxHp = (typeof merged.maxHp === "number")
    ? merged.maxHp
    : (typeof merged.hp === "number" ? merged.hp : 10);

  const history = Array.isArray(merged.levelHistory) ? [...merged.levelHistory] : [];

  if (history.length === 0) {
    const nextLevel = Math.max(1, level - 1);

    setEnemyOverride(merged.instanceId, { level: nextLevel });

    if (sessionId) {
      sendMsg({
        type: "enemyAdjust",
        sessionId,
        enemyInstanceId: merged.instanceId,
        levelDelta: -1
      });
    }

    renderEnemies(lastEnemiesState || []);
    alert("Level down: no undo history found for HP, so only level was reduced.");
    return;
  }

  const last = history.pop();
  const hpGained = Number(last?.hpGained || 0);

  const nextLevel = Math.max(1, level - 1);
  const nextMaxHp = Math.max(1, maxHp - hpGained);

  const currentHp = (typeof merged.hp === "number") ? merged.hp : nextMaxHp;
  const nextHp = Math.min(currentHp, nextMaxHp);

  setEnemyOverride(merged.instanceId, {
    level: nextLevel,
    maxHp: nextMaxHp,
    hp: nextHp,
    levelHistory: history
  });

  if (sessionId) {
    sendMsg({
      type: "enemyAdjust",
      sessionId,
      enemyInstanceId: merged.instanceId,
      hpDelta: (nextHp - currentHp),
      maxHpDelta: -hpGained,
      levelDelta: -1,
      setHp: nextHp,
      levelHistoryPop: true
    });
  }

  renderEnemies(lastEnemiesState || []);
  alert(`Level down! Undid ${hpGained} HP from the last level up.`);
}

// -----------------------------------------------------------------------------
// PARTY LIST
// -----------------------------------------------------------------------------
function renderPlayersList(players, myId) {
  const ul = document.getElementById("playersList");
  if (!ul) return;
  ul.innerHTML = "";

  (players || []).forEach((p) => {
    const li = document.createElement("li");
    const isMe = p.playerId === myId ? " (You)" : "";
    li.textContent = `${p.name} – Lv ${p.level || 1} ${p.race || ""} ${p.className || ""}${isMe}`;
    ul.appendChild(li);
  });
}

// -----------------------------------------------------------------------------
// DICE ROLLER (MULTI-DICE + AUTO-CLEAR)
// -----------------------------------------------------------------------------
const diceCountInputEl = document.getElementById("diceCountInput");

document.querySelectorAll(".die-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sides = parseInt(btn.dataset.die, 10);
    const count = diceCountInputEl
      ? Math.max(1, parseInt(diceCountInputEl.value, 10) || 1)
      : 1;

    if (!sessionId || !playerId) {
      alert("You must join a session first.");
      return;
    }

    sendMsg({
      type: "rollDice",
      sessionId,
      playerId,
      sides,
      count
    });
  });
});

function showDiceResult(msg) {
  const div = document.getElementById("diceResults");
  if (!div) return;

  const p = document.createElement("p");
  const name = msg.playerName || "Unknown";
  const count = msg.count || 1;
  const sides = msg.sides || msg.die || 6;

  if (Array.isArray(msg.rolls)) {
    if (count === 1) {
      p.textContent = `${name} rolled a d${sides}: ${msg.rolls[0]}`;
    } else {
      p.textContent = `${name} rolled ${count}d${sides}: [${msg.rolls.join(", ")}] = ${msg.total}`;
    }
  } else {
    p.textContent = `${name} rolled d${sides}: ${msg.result}`;
  }

  div.prepend(p);

  setTimeout(() => {
    if (p.parentNode) p.parentNode.removeChild(p);
  }, 60000);
}

// -----------------------------------------------------------------------------
// SKILLS / ABILITIES (ODD HIT, EVEN MISS)
// -----------------------------------------------------------------------------
function renderSkillsForPlayer(player) {
  const container = document.getElementById("skillsContainer");
  const hint = document.getElementById("classSkillsHint");
  const resultEl = document.getElementById("skillResult");

  if (!container || !hint) return;

  container.innerHTML = "";
  if (resultEl) resultEl.textContent = "";

  if (!player || !player.className) {
    hint.textContent = "No class selected yet. Pick a class above.";
    return;
  }

  const className = player.className;
  const abilities = getAbilitiesForClass(className);

  if (!abilities.length) {
    hint.textContent = `No abilities defined for class "${className}" yet.`;
    return;
  }

  hint.textContent = `Abilities for ${className}:`;
  abilities.forEach((ability) => {
    const btn = document.createElement("button");
    btn.className = "skill-btn";
    btn.dataset.abilityId = ability.id;
    btn.innerHTML = `<strong>${ability.name}</strong><br /><small>${ability.desc || ability.description || ""}</small>`;
    container.appendChild(btn);
  });
}

const skillsContainerEl = document.getElementById("skillsContainer");
if (skillsContainerEl) {
  skillsContainerEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button.skill-btn");
    if (!btn) return;

    if (!currentPlayer || !currentPlayer.className) {
      alert("No class selected for your player.");
      return;
    }

    const abilities = getAbilitiesForClass(currentPlayer.className);
    const abilityId = btn.dataset.abilityId;
    const ability = abilities.find((a) => a.id === abilityId);
    if (!ability) return alert("Ability not found.");

    if (!sessionId || !playerId) return;

    const hitRoll = rollSingleDie(6);
    const success = (hitRoll % 2) === 1;

    const nexusCost = ability.nexusCost || 0;

    if (success && nexusCost > (currentPlayer.nexus ?? 0)) {
      alert("Not enough Nexus to use this ability.");
      return;
    }

    if (success && nexusCost > 0) {
      currentPlayer.nexus = (currentPlayer.nexus ?? 0) - nexusCost;
      updatePlayerInfo(currentPlayer);
      syncPlayerUpdate();
    }

    let totalDamage = 0;
    let breakdown = "";

    if (success && ability.damage && ability.damage !== "0d0") {
      const dmgRoll = rollDamageFormula(ability.damage);
      totalDamage = dmgRoll.total;
      breakdown = dmgRoll.breakdown;
    } else if (!success) {
      breakdown = `MISS (even roll).`;
    }

    sendMsg({
      type: "skillUse",
      sessionId,
      playerId,
      abilityId: ability.id,
      abilityName: ability.name,
      success,
      hitRoll,
      totalDamage,
      breakdown,
      nexusCost,
      remainingNexus: currentPlayer.nexus ?? 0
    });
  });
}

function showSkillResult(msg) {
  const resultEl = document.getElementById("skillResult");
  if (!resultEl) return;

  const {
    playerName,
    abilityName,
    success,
    hitRoll,
    totalDamage,
    breakdown,
    nexusCost,
    remainingNexus
  } = msg;

  const successText = success ? "HIT" : "MISS";
  const dmgText = success
    ? `Dealt ${totalDamage} damage. (${breakdown || "no breakdown"})`
    : `${breakdown || "No damage dealt."}`;
  const nexusText =
    nexusCost && nexusCost > 0
      ? `Spent ${nexusCost} Nexus (remaining: ${remainingNexus}).`
      : "";

  resultEl.textContent =
    `${playerName} uses ${abilityName}: ${successText}. ` +
    `Hit roll: ${hitRoll}. ${dmgText} ${nexusText}`;
}

// -----------------------------------------------------------------------------
// ENEMIES (UI RENDERING + REMOVE SUPPORT)
// -----------------------------------------------------------------------------
let lastEnemiesState = [];

window.addEventListener("ros:addEnemy", (ev) => {
  const enemyKey = ev?.detail?.enemyKey;
  if (!enemyKey) return;

  if (!sessionId) {
    alert("Join a session first.");
    return;
  }

  sendMsg({
    type: "addEnemy",
    sessionId,
    enemyKey
  });
});

function renderEnemies(enemies) {
  const panel = document.getElementById("enemyPanel");
  if (!panel) return;

  // Keep the most recent enemy list so local overrides can re-render instantly
  lastEnemiesState = Array.isArray(enemies) ? enemies : [];

  panel.innerHTML = "";

  if (!Array.isArray(enemies) || enemies.length === 0) {
    panel.textContent = "No enemies in this conflict.";
    return;
  }

  enemies.forEach((enemy) => {
    const enemyView = applyEnemyOverrides(enemy);

    // Default fields so UI doesn't crash
    if (typeof enemyView.level !== "number") enemyView.level = 1;
    if (!Array.isArray(enemyView.levelHistory)) enemyView.levelHistory = [];
    if (typeof enemyView.maxHp !== "number") enemyView.maxHp = (typeof enemyView.hp === "number" ? enemyView.hp : 10);

    const def = window.ENEMY_DEFS?.[enemyView.key];
    const displayName = enemyView.name || def?.name || enemyView.key;

     const card = document.createElement("details");
card.className = "enemy-card";
card.open = true; 
card.dataset.enemyInstanceId = enemyView.instanceId;

const summary = document.createElement("summary");
summary.className = "enemy-card__summary";

const title = document.createElement("h3");
title.textContent = displayName;
const focusBtn = document.createElement("button");
focusBtn.type = "button";
focusBtn.className = "enemy-focus-btn";
focusBtn.textContent = "Focus";
focusBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation(); // prevents collapsing the <details>
  focusEnemyToken(enemyView.instanceId);
});

title.style.cursor = "pointer";
title.addEventListener("click", (e) => {
  e.stopPropagation(); // don't toggle collapse
  pendingEnemyInstanceId = enemyView.instanceId;
});

summary.appendChild(title);
summary.appendChild(focusBtn);
card.appendChild(summary);


    // --- HP METER ---
    const hpRow = document.createElement("div");
    hpRow.className = "stat-row";
    const hpCurrent = Number(enemyView.hp ?? 0);
    const hpMax = Number(enemyView.maxHp ?? 1);

    hpRow.innerHTML = `
      <p><strong>HP:</strong> <span>${hpCurrent} / ${hpMax}</span></p>
      <div class="meter" aria-label="Enemy HP bar">
        <div class="meter-fill hp"></div>
      </div>
    `;
    card.appendChild(hpRow);

    // fill HP
    const hpFill = hpRow.querySelector(".meter-fill.hp");
    setMeterFill(hpFill, hpCurrent, hpMax);

    // --- NEXUS METER ---
    const nxRow = document.createElement("div");
    nxRow.className = "stat-row";
    const nxCurrent = Number(enemyView.nexus ?? 0);
    const nxMax = Number(enemyView.maxNexus ?? 1);

    nxRow.innerHTML = `
      <p><strong>Nexus:</strong> <span>${nxCurrent} / ${nxMax}</span></p>
      <div class="meter" aria-label="Enemy Nexus bar">
        <div class="meter-fill nexus"></div>
      </div>
    `;
    card.appendChild(nxRow);

    // fill Nexus
    const nxFill = nxRow.querySelector(".meter-fill.nexus");
    setMeterFill(nxFill, nxCurrent, nxMax);

    // --- STRESS BAR ---
    const stressWrap = document.createElement("div");
    stressWrap.className = "stat-row";
    stressWrap.innerHTML = `<p><strong>Stress:</strong> <span>${Number(enemyView.stress ?? 0)}</span></p>`;
    const stressBar = document.createElement("div");
    stressBar.className = "stress-bar";
    stressBar.setAttribute("aria-label", "Enemy Stress bar");
    stressWrap.appendChild(stressBar);
    card.appendChild(stressWrap);

    renderEnemyStressBar(stressBar, enemyView.stress ?? 0);

    // --- LEVEL DISPLAY ---
    const lvlRow = document.createElement("div");
    lvlRow.className = "stat-row";
    lvlRow.innerHTML = `<p><strong>Level:</strong> <span>${enemyView.level || 1}</span></p>`;
    card.appendChild(lvlRow);


    // --- CONTROLS (HP / NEXUS / STRESS) ---
    const controls = document.createElement("div");
    controls.className = "enemy-controls";

    // HP buttons
    const hpMinus1 = document.createElement("button");
    hpMinus1.textContent = "HP -1";
    hpMinus1.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, hpDelta: -1 });
    });

    const hpPlus1 = document.createElement("button");
    hpPlus1.textContent = "HP +1";
    hpPlus1.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, hpDelta: +1 });
    });

    const hpMinus5 = document.createElement("button");
    hpMinus5.textContent = "HP -5";
    hpMinus5.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, hpDelta: -5 });
    });

    const hpPlus5 = document.createElement("button");
    hpPlus5.textContent = "HP +5";
    hpPlus5.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, hpDelta: +5 });
    });

    // Nexus buttons
    const nxMinus1 = document.createElement("button");
    nxMinus1.textContent = "Nexus -1";
    nxMinus1.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, nexusDelta: -1 });
    });

    const nxPlus1 = document.createElement("button");
    nxPlus1.textContent = "Nexus +1";
    nxPlus1.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, nexusDelta: +1 });
    });

    const nxMinus5 = document.createElement("button");
    nxMinus5.textContent = "Nexus -5";
    nxMinus5.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, nexusDelta: -5 });
    });

    const nxPlus5 = document.createElement("button");
    nxPlus5.textContent = "Nexus +5";
    nxPlus5.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, nexusDelta: +5 });
    });

    // Stress buttons
    const stMinus1 = document.createElement("button");
    stMinus1.textContent = "Stress -1";
    stMinus1.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, stressDelta: -1 });
    });

    const stPlus1 = document.createElement("button");
    stPlus1.textContent = "Stress +1";
    stPlus1.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemyView.instanceId, stressDelta: +1 });
    });

    // Add buttons to the controls row
    controls.appendChild(hpMinus1);
    controls.appendChild(hpPlus1);
    controls.appendChild(hpMinus5);
    controls.appendChild(hpPlus5);

    controls.appendChild(nxMinus1);
    controls.appendChild(nxPlus1);
    controls.appendChild(nxMinus5);
    controls.appendChild(nxPlus5);

    controls.appendChild(stMinus1);
    controls.appendChild(stPlus1);

    // Level buttons (same idea as player controls)
    const lvlUpBtn = document.createElement("button");
    lvlUpBtn.textContent = "⬆ Level Up (3d6 HP)";
    lvlUpBtn.addEventListener("click", () => enemyLevelUp(enemyView));

    const lvlDownBtn = document.createElement("button");
    lvlDownBtn.textContent = "⬇ Level Down (undo last)";
    lvlDownBtn.addEventListener("click", () => enemyLevelDown(enemyView));

    controls.appendChild(lvlUpBtn);
    controls.appendChild(lvlDownBtn);

const removeBtn = document.createElement("button");
removeBtn.type = "button";
removeBtn.textContent = "Remove";
removeBtn.addEventListener("click", () => {
  if (!sessionId) return;
  sendMsg({
    type: "removeEnemy",
    sessionId,
    enemyInstanceId: enemyView.instanceId
  });
});

controls.appendChild(removeBtn);

    card.appendChild(controls);

    // Finally add card to the panel
    panel.appendChild(card);
  });
}

  

// -----------------------------------------------------------------------------
// COMBAT LOG
// -----------------------------------------------------------------------------
function appendCombatLog(entry) {
  const log = document.getElementById("combatLog");
  if (!log) return;

  const line = document.createElement("div");
  if (!entry) {
    line.textContent = "Combat update.";
  } else if (entry.note) {
    line.textContent = entry.note;
  } else {
    line.textContent =
      `${entry.sourceName || "Enemy"} used ${entry.abilityName || "Ability"}` +
      (entry.breakdown ? `: ${entry.breakdown}` : "");
  }

  log.prepend(line);
}

// -----------------------------------------------------------------------------
// Initial map draw (in case sessionState hasn't arrived yet)
// -----------------------------------------------------------------------------
renderMap();
