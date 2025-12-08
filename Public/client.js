console.log("Client JS Loaded");

// -----------------------------------------------------------------------------
// GLOBAL STATE
// -----------------------------------------------------------------------------
let socket;
let sessionId = null;
let playerId = null;
let currentPlayer = null;

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
    {
      id: "rhythm_basic_melee",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "rhythm_dissonant_chord",
      name: "Dissonant Chord",
      desc: "Soundwave attack that damages and disorients.",
      damage: "3d6",
      nexusCost: 10
    },
    {
      id: "rhythm_euphoric_melody",
      name: "Euphoric Melody",
      desc: "Play a beautiful melody that inspires allies for 2 turns. Roll 1d20 for effectiveness.",
      damage: "1d20",    // used as an 'effectiveness' roll by the roller
      nexusCost: 10
    },
    {
      id: "rhythm_crippling_strike",
      name: "Crippling Strike",
      desc: "A quick precise dagger attack that gives the ability to retreat up to 10 ft.",
      damage: "2d6",
      nexusCost: 10
    },
    {
      id: "rhythm_blessing_of_syncretis",
      name: "Blessing of Syncretis",
      desc: "Sing a long harmonious note attuning with nature. Allies gain +2 to attack; roll 5d10 as a potency check.",
      damage: "5d10",
      nexusCost: 20
    }
  ]
};


// -----------------------------------------------------------------------------
// ABILITY LOOKUP (SAFE, FUZZY BY CLASS NAME)
// -----------------------------------------------------------------------------
function getAbilitiesForClass(className) {
  if (!className) return [];

  // Exact key match first
  if (typeof ABILITIES_BY_CLASS !== "undefined" && ABILITIES_BY_CLASS[className]) {
    return ABILITIES_BY_CLASS[className];
  }

  if (!ABIlITIES_BY_CLASS) return [];

  const normalized = className.trim().toLowerCase();
  let bestMatch = null;

  // Case-insensitive exact key match
  for (const key of Object.keys(ABIlITIES_BY_CLASS)) {
    if (key.toLowerCase() === normalized) {
      return ABIlITIES_BY_CLASS[key];
    }
  }

  // "Contains" matching: e.g. "Tears of Dragoon" → "Tears"
  for (const key of Object.keys(ABIlITIES_BY_CLASS)) {
    const keyNorm = key.toLowerCase();
    if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) {
      bestMatch = ABIlITIES_BY_CLASS[key];
      break;
    }
  }

  return bestMatch || [];
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

// "2d6+1d4" style parsing – adjust to your formulas
function rollDamageFormula(formula) {
  const clean = String(formula || "").trim();
  if (!clean || clean === "0" || clean === "0d6" || clean === "0d0") {
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

  return {
    total,
    breakdown: breakdowns.join(" | ")
  };
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
      // Full snapshot when joining/rejoining
      sessionId = msg.sessionId;
      playerId = msg.you.playerId;

      localStorage.setItem("sessionId", sessionId);
      localStorage.setItem("playerId", playerId);

      const connectSection = document.getElementById("connectSection");
      const mainNav = document.getElementById("mainNav");
      if (connectSection) connectSection.classList.add("hidden");
      if (mainNav) mainNav.classList.remove("hidden");
      showTab("playerTab");

      currentPlayer = msg.you;
      updatePlayerInfo(currentPlayer);
      renderSkillsForPlayer(currentPlayer);

      if (Array.isArray(msg.players)) {
        renderPlayersList(msg.players, playerId);
      }
      if (msg.map && msg.map.url) {
        renderMap(msg.map.url);
      }
      if (msg.story) {
        updateStory(msg.story);
      }
    }

    else if (type === "sessionJoined") {
      // Initial confirmation; sessionState will follow
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
      if (Array.isArray(msg.players)) {
        renderPlayersList(msg.players, playerId);
      }
    }

    else if (type === "playersList") {
      renderPlayersList(msg.players || [], playerId);
    }

    else if (type === "diceResult") {
      showDiceResult(msg);
    }

    else if (type === "mapUpdate") {
      if (msg.map && msg.map.url) {
        renderMap(msg.map.url);
      }
    }

    else if (type === "storyUpdate") {
      updateStory(msg.story);
    }

    else if (type === "skillResult") {
      showSkillResult(msg);
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

// Kick off initial WS connection
connectWebSocket();


// -----------------------------------------------------------------------------
// JOIN / REJOIN
// -----------------------------------------------------------------------------
const joinBtnEl = document.getElementById("joinBtn");
if (joinBtnEl) {
  joinBtnEl.addEventListener("click", () => {
    const rawId = document.getElementById("sessionIdInput").value.trim();
    const name = document.getElementById("playerNameInput").value.trim();
    const race = document.getElementById("raceSelect").value.trim();
    const className = document.getElementById("classSelect").value.trim();
    const isSw = document.getElementById("isSwCheckbox").checked;

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
      className,
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

    const normalizedId = savedId.toUpperCase();

    sendMsg({
      type: "rejoinSession",
      sessionId: normalizedId,
      playerId: savedPlayer,
    });
  });
}


// -----------------------------------------------------------------------------
// TABS
// -----------------------------------------------------------------------------
function showTab(tabId) {
  document
    .querySelectorAll(".tab")
    .forEach((el) => el.classList.add("hidden"));

  const tabEl = document.getElementById(tabId);
  if (tabEl) tabEl.classList.remove("hidden");

  const swBtn = document.getElementById("swTabButton");
  if (swBtn) {
    if (tabId === "storyWeaverTab") {
      swBtn.classList.add("active-tab");
    } else {
      swBtn.classList.remove("active-tab");
    }
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
// MAP & STORY / CONFLICT
// -----------------------------------------------------------------------------
const setMapBtn = document.getElementById("setMapBtn");
if (setMapBtn) {
  setMapBtn.addEventListener("click", () => {
    const input = document.getElementById("mapUrlInput");
    const url = input ? input.value.trim() : "";
    if (!sessionId) return;
    sendMsg({ type: "updateMap", sessionId, url });
  });
}

function renderMap(url) {
  const div = document.getElementById("mapDisplay");
  if (!div) return;

  if (!url) {
    div.textContent = "No map selected.";
    return;
  }

  div.innerHTML = `<img src="${url}" alt="Map" style="max-width: 100%; border-radius: 0.75rem;" />`;
}

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
      name: name || "Unnamed Conflict",
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
// PLAYER STATS (NEXUS, STRESS, LEVEL)
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
  if (stressBar) {
    // If you want to do fancy CSS with --stress you can
    stressBar.dataset.value = player.stress ?? 0;
  }
}

function syncPlayerUpdate() {
  if (!sessionId || !playerId || !currentPlayer) return;
  sendMsg({
    type: "playerUpdate",
    sessionId,
    playerId,
    player: currentPlayer,
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
  if (!currentPlayer) return;
  const maxStress = 10;
  let newVal = (currentPlayer.stress ?? 0) + delta;
  newVal = Math.max(0, Math.min(maxStress, newVal));
  currentPlayer.stress = newVal;
  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
}

function resetStress() {
  if (!currentPlayer) return;
  currentPlayer.stress = 0;
  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
}

function levelUp() {
  if (!currentPlayer) return;
  const { total: gained } = rollDice(3, 6);
  currentPlayer.level = (currentPlayer.level || 1) + 1;
  currentPlayer.maxHp = (currentPlayer.maxHp || 0) + gained;
  currentPlayer.currentHp = currentPlayer.maxHp;
  updatePlayerInfo(currentPlayer);
  syncPlayerUpdate();
  alert(`You gained ${gained} HP (3d6).`);
}

function levelDown() {
  alert("Level down undo not fully implemented yet.");
}

const levelUpBtn = document.getElementById("levelUpBtn");
if (levelUpBtn) {
  levelUpBtn.addEventListener("click", levelUp);
}
const levelDownBtn = document.getElementById("levelDownBtn");
if (levelDownBtn) {
  levelDownBtn.addEventListener("click", levelDown);
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

    // Matches server.js in the final zip: sides + count
    sendMsg({
      type: "rollDice",
      sessionId,
      playerId,
      sides,
      count,
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
      p.textContent = `${name} rolled ${count}d${sides}: [${msg.rolls.join(
        ", "
      )}] = ${msg.total}`;
    }
  } else {
    // Fallback if server ever sends the old shape
    p.textContent = `${name} rolled d${sides}: ${msg.result}`;
  }

  // Newest first
  div.prepend(p);

  // Auto-remove line after 60 seconds
  setTimeout(() => {
    if (p.parentNode) {
      p.parentNode.removeChild(p);
    }
  }, 60000);
}


// -----------------------------------------------------------------------------
// SKILLS / ABILITIES
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
    if (!ability) {
      alert("Ability not found.");
      return;
    }

    if (!sessionId || !playerId) return;

    const hitRoll = rollSingleDie(6);
    const success = hitRoll >= 3;

    const nexusCost = ability.nexusCost || 0;
    if (nexusCost > (currentPlayer.nexus ?? 0)) {
      alert("Not enough Nexus to use this ability.");
      return;
    }

    if (success) {
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
    }

    // Tell the server; it will broadcast `skillResult` to everyone
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
      remainingNexus: currentPlayer.nexus ?? 0,
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
    remainingNexus,
  } = msg;

  const successText = success ? "SUCCESS" : "FAILURE";
  const dmgText = success
    ? `Dealt ${totalDamage} damage. (${breakdown || "no breakdown"})`
    : "No damage dealt.";
  const nexusText =
    nexusCost && nexusCost > 0
      ? `Spent ${nexusCost} Nexus (remaining: ${remainingNexus}).`
      : "";

  resultEl.textContent =
    `${playerName} uses ${abilityName}: ${successText}. ` +
    `Hit roll: ${hitRoll}. ${dmgText} ${nexusText}`;
}
