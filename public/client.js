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
let tokens = [];      // { id, type: "enemy"|"warden", x01, y01 }
let selectedTokenId = null;

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
        const t = { id: makeId(), type, x01, y01 };
        tokens.push(t);
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

// -----------------------------------------------------------------------------
// PLAYER STATS (NEXUS, STRESS, LEVEL, HP MANAGEMENT)
// -----------------------------------------------------------------------------
function updatePlayerInfo(player) {
  if (!player) return;
  currentPlayer = player;

  const nameEl = document.getElementById("playerNameDisplay");
  const raceEl = document.getElementById("playerRaceDisplay");
  const classEl = document.getElementById("playerClassDisplay");
  const hpEl = document.getElementById("hpDisplay");
  const lvlEl = document.getElementById("levelDisplay");
  const nexusVal = document.getElementById("nexusValue");
  const maxNexusVal = document.getElementById("maxNexusValue");
  const stressBar = document.getElementById("stressBar");

  if (nameEl) nameEl.textContent = player.name || "—";
  if (raceEl) raceEl.textContent = player.race || "—";
  if (classEl) classEl.textContent = player.className || "—";
  if (hpEl) hpEl.textContent = `${player.currentHp} / ${player.maxHp}`;
  if (lvlEl) lvlEl.textContent = player.level || 1;
  if (nexusVal) nexusVal.textContent = player.nexus ?? 40;
  if (maxNexusVal) maxNexusVal.textContent = player.maxNexus ?? 40;
  if (stressBar) stressBar.dataset.value = player.stress ?? 0;
  renderStressBar(player.stress ?? 0);
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

  panel.innerHTML = "";

  if (!Array.isArray(enemies) || enemies.length === 0) {
    panel.textContent = "No enemies in this conflict.";
    return;
  }

  enemies.forEach((enemy) => {
    const def = window.ENEMY_DEFS?.[enemy.key];

    const card = document.createElement("div");
    card.className = "enemy-card";

    const title = document.createElement("h3");
    const hpText =
      (enemy.hp != null && enemy.maxHp != null) ? `HP ${enemy.hp}/${enemy.maxHp}` : "HP —";
    const nxText =
      (enemy.nexus != null && enemy.maxNexus != null) ? `Nexus ${enemy.nexus}/${enemy.maxNexus}` : "Nexus —";
    title.textContent = `${enemy.name || def?.name || enemy.key} — ${hpText} — ${nxText}`;
    card.appendChild(title);

    const controls = document.createElement("div");
    controls.className = "enemy-controls";

    // ✅ NEW: HP +/-1
    const dmg1Btn = document.createElement("button");
    dmg1Btn.textContent = "HP -1";
    dmg1Btn.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemy.instanceId, hpDelta: -1 });
    });

    const heal1Btn = document.createElement("button");
    heal1Btn.textContent = "HP +1";
    heal1Btn.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemy.instanceId, hpDelta: +1 });
    });

    const dmgBtn = document.createElement("button");
    dmgBtn.textContent = "HP -5";
    dmgBtn.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemy.instanceId, hpDelta: -5 });
    });

    const healBtn = document.createElement("button");
    healBtn.textContent = "HP +5";
    healBtn.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemy.instanceId, hpDelta: +5 });
    });

    const nexusDownBtn = document.createElement("button");
    nexusDownBtn.textContent = "Nexus -5";
    nexusDownBtn.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemy.instanceId, nexusDelta: -5 });
    });

    const nexusUpBtn = document.createElement("button");
    nexusUpBtn.textContent = "Nexus +5";
    nexusUpBtn.addEventListener("click", () => {
      if (!sessionId) return;
      sendMsg({ type: "enemyAdjust", sessionId, enemyInstanceId: enemy.instanceId, nexusDelta: +5 });
    });

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "💀 Remove";
    removeBtn.className = "enemy-remove-btn";
    removeBtn.addEventListener("click", () => {
      if (!sessionId) return;
      const ok = confirm(`Remove ${enemy.name || def?.name || enemy.key}? This cannot be undone.`);
      if (!ok) return;
      sendMsg({ type: "removeEnemy", sessionId, enemyInstanceId: enemy.instanceId });
    });

    controls.appendChild(dmg1Btn);
    controls.appendChild(heal1Btn);
    controls.appendChild(dmgBtn);
    controls.appendChild(healBtn);
    controls.appendChild(nexusDownBtn);
    controls.appendChild(nexusUpBtn);
    controls.appendChild(removeBtn);
    card.appendChild(controls);

    if (def?.abilities?.length) {
      const abilitiesWrap = document.createElement("div");
      abilitiesWrap.className = "enemy-abilities";

      def.abilities.forEach((ab) => {
        const btn = document.createElement("button");
        btn.className = "enemy-ability-btn";
        btn.textContent =
          `${ab.name}` +
          (ab.roll && ab.roll !== "—" ? ` (${ab.roll})` : "") +
          (ab.cost ? ` [${ab.cost} NX]` : "");

        btn.addEventListener("click", () => {
          if (!sessionId) return;
          sendMsg({
            type: "enemyUseAbility",
            sessionId,
            enemyInstanceId: enemy.instanceId,
            abilityId: ab.id
          });
        });

        abilitiesWrap.appendChild(btn);
      });

      card.appendChild(abilitiesWrap);
    } else {
      const warn = document.createElement("div");
      warn.textContent = "Enemy abilities not loaded (enemy_defs.js missing or key mismatch).";
      card.appendChild(warn);
    }

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
