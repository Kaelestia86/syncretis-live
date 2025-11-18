console.log("Client JS Loaded");
let socket;
let sessionId = null;
let playerId = null;
let currentPlayer = null;

// -----------------------------------------------------------------------------
// CLASS ABILITIES & SKILL HELPERS
// -----------------------------------------------------------------------------

// Abilities keyed by the exact class names used in the class <select>.
const ABILITIES_BY_CLASS = {
  "Talons of Dragoon": [
    {
      id: "talons_basic",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "talons_harm_strike",
      name: "Harmonious Strike",
      desc: "Empowered strike guided by Nexus.",
      damage: "2d10",
      nexusCost: 10
    },
    {
      id: "talons_twin_roar",
      name: "Twin Roar",
      desc: "Two heavy follow-up strikes.",
      damage: "2d10+2d10",
      nexusCost: 10
    },
    {
      id: "talons_dash_attack",
      name: "Dash Attack",
      desc: "Dash in, strike, then pull back.",
      damage: "1d10",
      nexusCost: 10
    },
    {
      id: "talons_jump_attack",
      name: "Jump Attack",
      desc: "Leap into the air and slam down.",
      damage: "3d10",
      nexusCost: 10
    }
  ],

  "Scales of Dragoon": [
    {
      id: "scales_basic_melee",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "scales_radiant_lance",
      name: "Radiant Lance",
      desc: "Lance of Nexus light in a line.",
      damage: "1d20",
      nexusCost: 10
    },
    {
      id: "scales_power_harmony",
      name: "Power of Harmony",
      desc: "Empowered strike channelling inner balance.",
      damage: "2d10",
      nexusCost: 10
    },
    {
      id: "scales_shield_pulse",
      name: "Shield Pulse",
      desc: "Shockwave from your shield.",
      damage: "2d10",
      nexusCost: 10
    },
    {
      id: "scales_basic_crossbow",
      name: "Basic Crossbow Shot",
      desc: "Simple ranged crossbow shot.",
      damage: "1d6",
      nexusCost: 0
    },
    {
      id: "scales_nexus_guidance",
      name: "Nexus Guidance",
      desc: "Guided ranged shot that can arc or burst.",
      damage: "1d20",
      nexusCost: 10
    }
  ],

  "Eyes of Dragoon": [
    {
      id: "eyes_basic_melee",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "eyes_crippling_strike",
      name: "Crippling Strike",
      desc: "Targeted strike to hamper movement.",
      damage: "2d6",
      nexusCost: 10
    },
    {
      id: "eyes_quick_strike",
      name: "Quick Strike",
      desc: "A flurry of rapid attacks.",
      damage: "3d6",
      nexusCost: 10
    },
    {
      id: "eyes_power_harmony",
      name: "Power of Harmony",
      desc: "Empowered strike guided by intuition.",
      damage: "2d10",
      nexusCost: 10
    },
    {
      id: "eyes_basic_bow",
      name: "Basic Bow Shot",
      desc: "Simple arrow shot.",
      damage: "1d6",
      nexusCost: 0
    },
    {
      id: "eyes_nexus_guidance",
      name: "Nexus Guidance",
      desc: "Empowered arrow shot; Nexus bends its path.",
      damage: "1d20",
      nexusCost: 10
    }
  ],

  "Tempest Weaver": [
    {
      id: "tempest_basic_melee",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "tempest_basic_wind",
      name: "Basic Wind Attack",
      desc: "Shards of cutting wind.",
      damage: "2d6",
      nexusCost: 0
    },
    {
      id: "tempest_healing_breeze",
      name: "Healing Breeze",
      desc: "Soothing wind that mends wounds.",
      damage: "3d10",
      nexusCost: 10
    },
    {
      id: "tempest_tornado",
      name: "Tornado",
      desc: "Swirling winds batter foes in a cone.",
      damage: "3d6",
      nexusCost: 10
    },
    {
      id: "tempest_rescue",
      name: "Rescue",
      desc: "Redirect an ally to safety.",
      damage: "0d6",
      nexusCost: 10
    }
  ],

  "Ember Sage": [
    {
      id: "ember_basic_melee",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "ember_basic_fire",
      name: "Basic Fire Attack",
      desc: "Bolts of flame hurled at a foe.",
      damage: "2d6",
      nexusCost: 0
    },
    {
      id: "ember_pyro_siphon",
      name: "Pyro-siphon",
      desc: "Explosion that feeds on gathered flame.",
      damage: "3d6",
      nexusCost: 10
    },
    {
      id: "ember_infernal_shroud",
      name: "Infernal Shroud",
      desc: "Fiery aura that burns nearby foes.",
      damage: "2d6",
      nexusCost: 10
    },
    {
      id: "ember_soul_fire_link",
      name: "Soul Fire Link",
      desc: "Bind ally's strikes with searing soul-flame.",
      damage: "2d10",
      nexusCost: 10
    }
  ],

  "Heart-Stone": [
    {
      id: "heart_basic_melee",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "heart_basic_earth",
      name: "Basic Earth Attack",
      desc: "Stone shards surge from below.",
      damage: "2d6",
      nexusCost: 0
    },
    {
      id: "heart_seismic_tomb",
      name: "Seismic Tomb",
      desc: "Crushing tremor that can entomb foes.",
      damage: "4d6",
      nexusCost: 10
    },
    {
      id: "heart_spire_strike",
      name: "Spire Strike",
      desc: "Jagged stone spikes launch in a line.",
      damage: "3d6",
      nexusCost: 10
    },
    {
      id: "heart_shard_barrage",
      name: "Shard Barrage",
      desc: "Ring of exploding rock around you.",
      damage: "4d6",
      nexusCost: 10
    }
  ],

  "Tears": [
    {
      id: "tears_basic_melee",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "tears_basic_water",
      name: "Basic Water Attack",
      desc: "Cutting jets of water.",
      damage: "2d6",
      nexusCost: 0
    },
    {
      id: "tears_caustic_spray",
      name: "Caustic Spray",
      desc: "Corrosive spray in a cone.",
      damage: "3d6",
      nexusCost: 10
    },
    {
      id: "tears_toxin_tide",
      name: "Toxin Tide",
      desc: "Wave of poisoned water.",
      damage: "2d6",
      nexusCost: 10
    },
    {
      id: "tears_viscous_wave",
      name: "Viscous Wave",
      desc: "Choking, slowing wave that lingers.",
      damage: "1d6",
      nexusCost: 10
    }
  ],

  "Eclipsar": [
    {
      id: "eclipsar_basic_melee",
      name: "Basic Swing",
      desc: "Standard melee weapon attack.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "eclipsar_basic_shadow",
      name: "Basic Shadow Attack",
      desc: "Blades of condensed shadow.",
      damage: "2d6",
      nexusCost: 0
    },
    {
      id: "eclipsar_sanguine_transfer",
      name: "Sanguine Transfer",
      desc: "Drain your own lifeblood to heal another.",
      damage: "3d6",
      nexusCost: 10
    },
    {
      id: "eclipsar_wither_and_mend",
      name: "Wither and Mend",
      desc: "Wither a foe while mending an ally.",
      damage: "3d6",
      nexusCost: 10
    },
    {
      id: "eclipsar_oblivion_veil",
      name: "Oblivion Veil",
      desc: "Veil damage now, unleash it later.",
      damage: "3d6",
      nexusCost: 10
    }
  ],

  "Shadow Weaver": [
    {
      id: "shadow_basic_dagger",
      name: "Basic Dagger Attack",
      desc: "Quick dagger strike from the dark.",
      damage: "1d10",
      nexusCost: 0
    },
    {
      id: "shadow_kusari_strike",
      name: "Ku-sari Strike",
      desc: "Hooking chain strike.",
      damage: "1d6",
      nexusCost: 0
    },
    {
      id: "shadow_dagger_combo",
      name: "Dagger Combo",
      desc: "Two precise dagger blows.",
      damage: "2d10",
      nexusCost: 10
    },
    {
      id: "shadow_veil_step",
      name: "Veil Step",
      desc: "Fade into shadow and reposition.",
      damage: "0d6",
      nexusCost: 10
    },
    {
      id: "shadow_kusari_pull",
      name: "Ku-sari Pull",
      desc: "Yank a foe closer with a spiked chain.",
      damage: "3d6",
      nexusCost: 10
    }
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
      id: "rhythm_beat_strike",
      name: "Beat Strike",
      desc: "Strike in time with the battle's pulse.",
      damage: "2d6",
      nexusCost: 10
    },
    {
      id: "rhythm_resonant_chord",
      name: "Resonant Chord",
      desc: "A resonant blow that echoes through allies.",
      damage: "2d10",
      nexusCost: 10
    },
    {
      id: "rhythm_crescendo",
      name: "Crescendo",
      desc: "Build to a powerful finishing strike.",
      damage: "3d6",
      nexusCost: 10
    }
  ],

  "Custom Warden": []
};

// Simple d6+ helpers for skills ----------------------------------------------
function rollSingleDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

// Parse dice formulas like "2d6", "3d10+2d6"
function rollDiceFormula(formula) {
  const clean = String(formula || "").trim();
  if (!clean || clean === "0" || clean === "0d6") {
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
    const rolls = [];

    for (let i = 0; i < count; i++) {
      const r = rollSingleDie(sides);
      rolls.push(r);
      total += r;
    }

    breakdowns.push(`${part}: [${rolls.join(", ")}]`);
  }

  return {
    total,
    breakdown: breakdowns.join(" | ") || "No damage dice."
  };
}

// -----------------------------------------------------------------------------
// WEBSOCKET CONNECTION
// -----------------------------------------------------------------------------
function getWebSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

function connectWebSocket() {
  socket = new WebSocket(getWebSocketUrl());

  socket.addEventListener("open", () => {
    console.log("WebSocket connected");
  });

  socket.addEventListener("message", (event) => {
    console.log("WS MESSAGE:", event.data);
    const msg = JSON.parse(event.data);
    const type = msg.type;

    if (type === "sessionState") {
      console.log("SESSION STATE RECEIVED:", msg);

      sessionId = msg.sessionId;
      playerId = msg.you.playerId;

      // remember for rejoin
      localStorage.setItem("sessionId", sessionId);
      localStorage.setItem("playerId", playerId);

      // Switch UI
      const connectSection = document.getElementById("connectSection");
      const mainNav = document.getElementById("mainNav");
      if (connectSection) connectSection.classList.add("hidden");
      if (mainNav) mainNav.classList.remove("hidden");
      showTab("playerTab");

      // Populate UI for "me"
      updatePlayerInfo(msg.you);
      currentPlayer = msg.you;

      // Skills panel, if present
      if (typeof renderSkillsForPlayer === "function") {
        renderSkillsForPlayer(currentPlayer);
      }

      // Full party list, map, story
      updatePlayersList(msg.players);
      updateMap(msg.mapUrl);
      updateStory(msg.story);
      return;
    }

    if (type === "playersUpdate") {
      updatePlayersList(msg.players);
      return;
    }

    if (type === "diceResult") {
      showDiceResult(msg);
      return;
    }

    if (type === "mapUpdate") {
      updateMap(msg.url);
      return;
    }

    if (type === "storyUpdate") {
      updateStory(msg.story);
      return;
    }

    if (type === "shatterEvent") {
      alert(msg.message);
      return;
    }

    if (type === "error") {
      alert(msg.message);
      return;
    }
  });

  socket.addEventListener("close", () => {
    console.warn("WebSocket closed");
  });
}

// kick off the connection as soon as the script loads
connectWebSocket();

// -----------------------------------------------------------------------------
// SEND HELPER
// -----------------------------------------------------------------------------
function sendMsg(obj) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("Tried to send over a closed socket:", obj);
    return;
  }
  socket.send(JSON.stringify(obj));
}

// -----------------------------------------------------------------------------
// JOIN SESSION
// -----------------------------------------------------------------------------
document.getElementById("joinBtn").addEventListener("click", () => {
  const rawId = document.getElementById("sessionIdInput").value.trim();
  const name = document.getElementById("playerNameInput").value.trim();
  const race = document.getElementById("raceSelect").value;
  const className = document.getElementById("classSelect").value;
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
    className
  });
});

// -----------------------------------------------------------------------------
// REJOIN SESSION
// -----------------------------------------------------------------------------
document.getElementById("rejoinBtn").addEventListener("click", () => {
  const savedId = localStorage.getItem("sessionId");
  const savedPlayer = localStorage.getItem("playerId");

  if (!savedId || !savedPlayer) {
    alert("No saved session found.");
    return;
  }

  sendMsg({
    type: "rejoinSession",
    sessionId: savedId,
    playerId: savedPlayer
  });
});

// -----------------------------------------------------------------------------
// DICE ROLLER
// -----------------------------------------------------------------------------
document.querySelectorAll(".die-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const die = parseInt(btn.dataset.die, 10);
    sendMsg({ type: "rollDice", die });
  });
});

function showDiceResult(msg) {
  const div = document.getElementById("diceResults");
  const p = document.createElement("p");
  p.textContent = `${msg.playerName} rolled D${msg.die}: ${msg.result}`;
  div.appendChild(p);

  // If you want auto-clear after 60s, we can wire it here later.
}

// -----------------------------------------------------------------------------
// TABS
// -----------------------------------------------------------------------------
function showTab(tabId) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(tabId).classList.remove("hidden");

  if (tabId === "storyWeaverTab") {
    document.getElementById("swTabButton").classList.add("active-tab");
  } else {
    document.getElementById("swTabButton").classList.remove("active-tab");
  }
}

document.getElementById("mainNav").addEventListener("click", (e) => {
  if (e.target.dataset.tab) {
    showTab(e.target.dataset.tab);
  }
});

// -----------------------------------------------------------------------------
// STORY WEAVER CONTROLS
// -----------------------------------------------------------------------------
document.getElementById("mapUrlInput").addEventListener("change", (e) => {
  const url = e.target.value.trim();
  if (!sessionId) return;
  sendMsg({ type: "updateMap", url });
});

document.getElementById("storyInput").addEventListener("blur", (e) => {
  const storyText = e.target.value;
  if (!sessionId) return;
  sendMsg({ type: "updateStory", story: { text: storyText } });
});

document.getElementById("startConflictBtn").addEventListener("click", () => {
  const name = document.getElementById("conflictNameInput").value.trim();
  if (!name) {
    alert("Enter a conflict name.");
    return;
  }
  sendMsg({ type: "startConflict", name });
});

document.getElementById("endConflictBtn").addEventListener("click", () => {
  sendMsg({ type: "endConflict" });
});

// -----------------------------------------------------------------------------
// NEXUS & STRESS CONTROLS
// -----------------------------------------------------------------------------
function changeNexus(amount) {
  if (!sessionId || !playerId) return;

  sendMsg({
    type: "updateNexus",
    sessionId,
    playerId,
    amount
  });
}

function resetNexus() {
  changeNexus(-9999);
}

function changeStress(amount) {
  if (!sessionId || !playerId) return;

  sendMsg({
    type: "updateStress",
    sessionId,
    playerId,
    amount
  });
}

function resetStress() {
  changeStress(-9999);
}

// -----------------------------------------------------------------------------
// PLAYER INFO & LIST
// -----------------------------------------------------------------------------
function updateStory(story) {
  const storyTextArea = document.getElementById("storyInput");
  const conflictInfoDiv = document.getElementById("conflictInfo");

  storyTextArea.value = story?.text || "";

  if (!story || !story.activeConflict) {
    conflictInfoDiv.textContent = "No active conflict.";
  } else {
    const { name, round } = story.activeConflict;
    conflictInfoDiv.textContent = `Conflict: ${name} (Round ${round})`;
  }
}

function updatePlayerInfo(player) {
  document.getElementById("playerNameDisplay").textContent = player.name;
  document.getElementById("playerRaceDisplay").textContent = player.race || "—";
  document.getElementById("playerClassDisplay").textContent = player.className || "—";
  document.getElementById("hpDisplay").textContent =
    `${player.currentHp} / ${player.maxHp}`;
  document.getElementById("levelDisplay").textContent = player.level;

  document.getElementById("nexusValue").textContent = player.nexus ?? 40;
  document.getElementById("maxNexusValue").textContent = player.maxNexus ?? 40;

  renderStressBar(player.stress ?? 0);
}

function updatePlayersList(players) {
  const ul = document.getElementById("playersList");
  ul.innerHTML = "";

  const me = players.find(p => p.playerId === playerId);

  players.forEach(p => {
    const li = document.createElement("li");
    const raceText = p.race ? `, ${p.race}` : "";
    const classText = p.className ? `, ${p.className}` : "";
    li.textContent = `${p.name}${raceText}${classText} (Lv ${p.level}, HP ${p.currentHp}/${p.maxHp})`;

    // Story Weaver gets remove buttons
    if (me && me.role === "storyWeaver") {
      const btn = document.createElement("button");
      btn.textContent = "Remove";
      btn.onclick = () => {
        if (confirm(`Remove ${p.name}?`)) {
          sendMsg({
            type: "removePlayer",
            sessionId,
            targetId: p.playerId
          });
        }
      };
      li.appendChild(btn);
    }

    ul.appendChild(li);
  });

  if (me) {
    updatePlayerInfo(me);
    currentPlayer = me;
    renderSkillsForPlayer(currentPlayer);
  }
}

function updateMap(url) {
  const div = document.getElementById("mapDisplay");
  if (!url) {
    div.textContent = "No map selected.";
  } else {
    div.innerHTML = `<img src="${url}" />`;
  }
}

function updateConflict(story) {
  const div = document.getElementById("conflictInfo");

  if (!story || !story.activeConflict) {
    div.textContent = "No active conflict.";
  } else {
    div.textContent = `Conflict: ${story.activeConflict.name} (Round ${story.activeConflict.round})`;
  }
}

function renderStressBar(stress) {
  const bar = document.getElementById("stressBar");
  bar.innerHTML = "";

  for (let i = 0; i < 10; i++) {
    const seg = document.createElement("div");
    seg.classList.add("stress-segment");

    if (i < stress) {
      if (stress <= 3) seg.classList.add("active-calm");
      else if (stress <= 6) seg.classList.add("active-strained");
      else if (stress <= 9) seg.classList.add("active-breaking");
      else seg.classList.add("active-shatter");
    }

    bar.appendChild(seg);
  }
}

// -----------------------------------------------------------------------------
// CLASS SKILLS UI
// -----------------------------------------------------------------------------

function getAbilitiesForClass(className) {
  if (!className) return [];
  return ABILITIES_BY_CLASS[className] || [];
}

function renderSkillsForPlayer(player) {
  const container = document.getElementById("skillsContainer");
  const hint = document.getElementById("classSkillsHint");
  const resultEl = document.getElementById("skillResult");

  if (!container || !resultEl) return;

  container.innerHTML = "";
  resultEl.textContent = "";

  if (!player || !player.className) {
    if (hint) {
      hint.textContent = "Select a class to see its skills.";
    }
    container.innerHTML = "<p class=\"skill-empty\">No class selected.</p>";
    return;
  }

  if (hint) {
    hint.textContent = "Click a skill to roll 1d6 (odds = success), spend Nexus, and roll damage.";
  }

  const abilities = getAbilitiesForClass(player.className);
  if (!abilities.length) {
    container.innerHTML = "<p class=\"skill-empty\">No skills configured for this class yet.</p>";
    return;
  }

  const frag = document.createDocumentFragment();

  abilities.forEach((ability) => {
    const wrapper = document.createElement("div");
    wrapper.className = "skill-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skill-btn";
    btn.dataset.abilityId = ability.id;
    btn.textContent = ability.nexusCost
      ? `${ability.name} (${ability.damage} | ${ability.nexusCost} Nexus)`
      : `${ability.name} (${ability.damage})`;

    const desc = document.createElement("p");
    desc.className = "skill-desc";
    desc.textContent = ability.desc;

    wrapper.appendChild(btn);
    wrapper.appendChild(desc);
    frag.appendChild(wrapper);
  });

  container.appendChild(frag);
}

// Click handler for using a skill
const skillsContainerEl = document.getElementById("skillsContainer");
if (skillsContainerEl) {
  skillsContainerEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button.skill-btn");
    if (!btn) return;

    if (!currentPlayer || !currentPlayer.className) {
      return;
    }

    const abilityId = btn.dataset.abilityId;
    const abilities = getAbilitiesForClass(currentPlayer.className);
    const ability = abilities.find((a) => a.id === abilityId);
    if (!ability) return;

    // 1) Roll 1d6 to see if the skill fires (odds = success)
    const hitRoll = rollSingleDie(6);
    const isSuccess = hitRoll % 2 === 1;

    const resultEl = document.getElementById("skillResult");
    const log = (text) => {
      if (resultEl) {
        resultEl.textContent = text;
      }
      console.log(text);
    };

    if (!isSuccess) {
      log(`${currentPlayer.name} tried to use ${ability.name} (1d6 = ${hitRoll}) → FAILED (even roll).`);
      return;
    }

    // 2) Check Nexus
    const cost = ability.nexusCost || 0;
    const currentNexus = currentPlayer.nexus ?? 40;

    if (cost > 0 && (!sessionId || !playerId)) {
      log(`Cannot spend Nexus for ${ability.name} yet (not joined to a session).`);
      return;
    }

    if (cost > 0 && currentNexus < cost) {
      log(`${currentPlayer.name} rolled ${hitRoll} (success) for ${ability.name}, but does not have enough Nexus (${currentNexus}/${cost}).`);
      return;
    }

    // 3) Spend Nexus (client-side quick update + server update)
    if (cost > 0) {
      // Send delta to the server
      sendMsg({
        type: "updateNexus",
        sessionId,
        playerId,
        amount: -cost
      });

      // Update local snapshot immediately
      currentPlayer.nexus = currentNexus - cost;
      updatePlayerInfo(currentPlayer);
    }

    // 4) Roll damage
    const { total, breakdown } = rollDiceFormula(ability.damage);

    log(
      `${currentPlayer.name} uses ${ability.name}! (1d6 = ${hitRoll}, success). ` +
      (cost > 0 ? `Spent ${cost} Nexus (now ${currentPlayer.nexus}). ` : "") +
      `Damage: ${ability.damage} → ${total}. Rolls: ${breakdown}`
    );
  });
}
