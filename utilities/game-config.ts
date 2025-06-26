import { PlayerClass } from "../entities/player-types";

export const USE_PARTICLES = true;

// game time in seconds
export const GAME_TIME = 4.5 * 60;

// cooldowns
export const SHOOTING_COOLDOWN = 500;
export const PUNCH_COOLDOWN = 500;

export const SEARCH_POINTS = {
  [1]: [
    { x: -17, y: 6, z: 20 },
    { x: 17, y: 6, z: 20 },
    { x: -17, y: 6, z: -20 },
  ],
  [2]: [
    { x: 17, y: 6, z: 20 },
    { x: 17, y: 6, z: -20 },
    { x: -17, y: 6, z: 20 },
  ],
};

// boost spawn interval
export const BOOST_SPAWN_INTERVAL = 10;
export const STRENGTH_BOOST_DURATION = 10000;
export const STRENGTH_BOOST_MULTIPLIER = 5;
export const ENERGY_BOOST_STAMINA_REGEN = 220;
export const INVINCIBILITY_BOOST_DURATION = 10000;

export const BOOST_PROBABILITIES = [
  {
    type: "energy",
    spawnProbability: 0.70,
  },
{
    type: "strength",
    spawnProbability: 0.10,
  },
  {
    type: "invincibility",
    spawnProbability: 0.20,
  }
];

// energy costs
export const SPRINT_ENERGY_COST = 0.85;
export const TACKLE_ENERGY_COST = 30;

export const STAMINA_REGEN_RATE = 10;

// class max staminas
export const MAX_STAMINA = {
  [PlayerClass.RUNNER]: 200,
  [PlayerClass.SNIPER]: 520,
  [PlayerClass.GRENADER]: 460,
  [PlayerClass.SLINGSHOT]: 440
}

// respawn
export const RESPAWN_TIME = 5 * 1000;
export const RESPAWN_INVINCIBILITY_TIME = 6 * 1000;
export const RESPAWN_HEIGHT = 45;

// friendly fire
export const FRIENDLY_FIRE_DISABLED = true;

// punch force
export const PUNCH_KNOCKBACK = 5;
export const PUNCH_PLAYER_FORCE = 10;
export const PUNCH_VERTICAL_FORCE = 2;

// projectiles
export type ProjectileType = 'BLOB' | 'SLINGSHOT' | 'SNIPER'

export const PROJECTILES = {
  BLOB: {
    NAME: 'BLOB',
    MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
    MODEL_SCALE: 2,
    SPEED: 30,
    KNOCKBACK: 12,
    ENERGY: -28,
    CCD_ENABLED: false,
    COOLDOWN: 500,
  },
  SLINGSHOT: {
    NAME: 'SLINGSHOT',
    MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
    MODEL_SCALE: 0.8,
    SPEED: 38,
    KNOCKBACK: 9,
    ENERGY: -30,
    CCD_ENABLED: false,
    COOLDOWN: 500,
  },
  SNIPER: {
    NAME: 'SNIPER',
    MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
    MODEL_SCALE: 0.8,
    SPEED: 60,
    KNOCKBACK: 9,
    ENERGY: -20,
    CCD_ENABLED: true,
    COOLDOWN: 300,
  }
}

export const PROJECTILE_MAP: { [key: string]: { type: string; energy: number; cooldown: number } } = {
  [PlayerClass.GRENADER]: { type: "BLOB", energy: PROJECTILES.BLOB.ENERGY, cooldown: PROJECTILES.BLOB.COOLDOWN },
  [PlayerClass.SLINGSHOT]: { type: "SLINGSHOT", energy: PROJECTILES.SLINGSHOT.ENERGY, cooldown: PROJECTILES.SLINGSHOT.COOLDOWN },
  [PlayerClass.SNIPER]: { type: "SNIPER", energy: PROJECTILES.SNIPER.ENERGY, cooldown: PROJECTILES.SNIPER.COOLDOWN },
};

export const SLINGSHOT_OFFSET = 15;
export const SLINGSHOT_SPEED_OFFSET = -2;

// UI Events
export const UI_EVENT_TYPES = {
    SHOW_CLASS_SELECT: "show-class-select",
    SHOW_PLAYER_LEADERBOARD: "show-player-leaderboard",
    GAME_UI: "game-ui",
    VICTORY: "victory",
    DEFEAT: "defeat",
    PLAYER_DEATH: "player-death",
    PLAYER_ID: "player-id",
    PLAYER_TEAMS: "player-teams"
  };

  export const UI_BUTTONS = {
    SELECT_CLASS: "select-class",
  }
