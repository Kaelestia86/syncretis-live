// enemies.js (SERVER AUTHORITATIVE DATA)

const ENEMIES = {

  stone_hopper: {
    key: "stone_hopper",
    name: "Stone Hopper",
    maxHp: 40,
    maxNexus: 20,
    abilities: [
      { id: "terra_surge", name: "Terra Surge", roll: "2d6", cost: 0 },
      { id: "rocky_spear_kick", name: "Rocky Spear Kick", roll: "4d6", cost: 10 },
      { id: "rapid_bite", name: "Rapid Bite", roll: "3d6", cost: 10 }
    ]
  },



  sool_scale: {
    key: "sool_scale",
    name: "Sool Scale",
    maxHp: 35,
    maxNexus: 30,
    abilities: [
      { id: "bite", name: "Bite", roll: "1d6", cost: 0 },
      { id: "acid_spit", name: "Acid Spit", roll: "2d6", cost: 10 },
      { id: "tail_swipe", name: "Tail Swipe", roll: "2d6", cost: 10 },
      { id: "poison_chance", name: "Poison Chance", roll: "—", cost: 10 },
      { id: "heated_skin", name: "Heated Skin", roll: "2d6", cost: 10 }
    ]
  },



  crest_claw: {
    key: "crest_claw",
    name: "Crest Claw",
    maxHp: 50,
    maxNexus: 25,
    abilities: [
      { id: "bite", name: "Bite", roll: "1d6", cost: 0 },
      { id: "tendril_slam", name: "Tendril Slam", roll: "4d6", cost: 10 },
      { id: "smoke_stream_barrage", name: "Smoke-Stream Barrage", roll: "3d6", cost: 10 },
      { id: "smoke_bind_net", name: "Smoke-Bind Net", roll: "—", cost: 10 }
    ]
  },



  poison_claw: {
    key: "poison_claw",
    name: "Poison Claw",
    maxHp: 45,
    maxNexus: 30,
    abilities: [
      { id: "bite", name: "Bite", roll: "1d6", cost: 0 },
      { id: "tendril_poison_grasp", name: "Tendril Poison Grasp", roll: "1d10", cost: 0 },
      { id: "poisonous_bite", name: "Poisonous Bite", roll: "1d6", cost: 10 },
      { id: "poison_cloud", name: "Poison Cloud", roll: "—", cost: 10 }
    ]
  },



  soul_strainer: {
    key: "soul_strainer",
    name: "Soul Strainer",
    maxHp: 60,
    maxNexus: 40,
    abilities: [
      { id: "claw_swipe", name: "Claw Swipe", roll: "1d10", cost: 0 },
      { id: "multi_claw", name: "Multi-Claw Attack", roll: "2d10", cost: 10 },
      { id: "alluring_song", name: "Alluring Song", roll: "—", cost: 10 },
      { id: "kiss", name: "Kiss", roll: "4d6", cost: 10 }
    ]
  },



  vex_wraith: {
    key: "vex_wraith",
    name: "Vex-Wraith",
    maxHp: 55,
    maxNexus: 35,
    abilities: [
      { id: "basic_melee", name: "Basic Melee Swing", roll: "—", cost: 0 },
      { id: "twilights_caress_poison", name: "Twilight’s Caress (Poison)", roll: "—", cost: 0 },
      { id: "fear_aura", name: "Fear Aura", roll: "—", cost: 0 },
      { id: "shadow_attack", name: "Shadow Attack", roll: "2d10", cost: 10 },
      { id: "flurry_of_blows", name: "Flurry of Blows", roll: "3d10", cost: 10 }
    ]
  },



  umbralyx: {
    key: "umbralyx",
    name: "Umbralyx",
    maxHp: 80,
    maxNexus: 40,
    abilities: [
      { id: "bite", name: "Bite", roll: "1d6", cost: 0 },
      { id: "great_axe", name: "Great Axe Attack", roll: "2d10", cost: 10 },
      { id: "frenzy", name: "Frenzy Attack", roll: "—", cost: 10 },
      { id: "battle_cry", name: "Battle Cry", roll: "—", cost: 0 }
    ]
  },




  umbralyx_sentry: {
    key: "umbralyx_sentry",
    name: "Umbralyx Sentry",
    maxHp: 74,
    maxNexus: 40,
    abilities: [
      { id: "bite", name: "Bite", roll: "1d6", cost: 0 },
      { id: "greataxe_attack", name: "Great Axe Attack", roll: "2d10", cost: 10 },
      { id: "frenzy_attack", name: "Frenzy Attack (Great Axe + Bite)", roll: "2d10+1d6", cost: 10 },
      { id: "battle_cry", name: "Battle Cry (Stun 1 turn on 1d6)", roll: "—", cost: 10 },
      { id: "bow_attack", name: "Bow Attack", roll: "1d6", cost: 10 },
      { id: "Volthrax_burst", name: "Volthrax Burst (Stun 1 turn on 1d6)", roll: "2d6", cost: 10 }
    ]
  },


  lt_silas: {
    key: "lt_silas",
    name: "Lt. Silas",
    maxHp: 90,
    maxNexus: 50,
    abilities: [
      { id: "bite", name: "Bite", roll: "1d6", cost: 0 },
      { id: "nexus_sword", name: "Nexus Sword Attack", roll: "1d10", cost: 10 },
      { id: "frenzy", name: "Frenzy Attack", roll: "—", cost: 20 },
      { id: "battle_roar", name: "Battle Roar", roll: "—", cost: 0 }
    ]
  },

  razor_beak_umbralyx: {
    key: "razor_beak_umbralyx",
    name: "Razor-Beak Umbralyx",
    maxHp: 96,
    maxNexus: 60,
    abilities: [
      { id: "peck_attack", name: "Peck Attack", roll: "2d6", cost: 0 },
      { id: "nexus_great_axe_attack", name: "Nexus Great Axe Attack", roll: "1d10", cost: 10 },
      { id: "frenzy_attack", name: "Frenzy Attack", roll: "—", cost: 20 },
      { id: "battle_roar", name: "Battle Roar", roll: "—", cost: 10 },
      { id: "rampage", name: "Rampage", roll: "3d6", cost: 0 }
    ]
  },

  crimson_nexus_conduit: {
    key: "crimson_nexus_conduit",
    name: "Crimson Nexus Conduit",
    maxHp: 150,
    maxNexus: 9999,
    abilities: [
      { id: "crimson_pull", name: "Crimson Pull", roll: "—", cost: 0 }
    ]
  }
};

module.exports = { ENEMIES };
