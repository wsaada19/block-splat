import { PlayerClass } from "../gameState/player-data";

// game time in seconds
export const GAME_TIME = 5 * 60;

// cooldowns
export const SHOOTING_COOLDOWN = 250;
export const JUMP_COOLDOWN = 0;
export const PUNCH_COOLDOWN = 500;

// boost spawn interval
export const BOOST_SPAWN_INTERVAL = 16;
export const STRENGTH_BOOST_DURATION = 10000;
export const STRENGTH_BOOST_MULTIPLIER = 5;
export const ENERGY_BOOST_STAMINA_REGEN = 150;

// energy costs
export const SPRINT_ENERGY_COST = 1;
export const PUNCH_ENERGY_COST = 20;

export const STAMINA_REGEN_RATE = 9;

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
export const PUNCH_FORCE = 12;
export const PUNCH_PLAYER_FORCE = 10;
export const PUNCH_VERTICAL_FORCE = 15;

// projectiles
export type ProjectileType = 'BLOB' | 'ARROW' | 'SNIPER'

export const PROJECTILES = {
  BLOB: {
    NAME: 'BLOB',
    MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
    MODEL_SCALE: 2,
    SPEED: 30,
    KNOCKBACK: 25,
    ENERGY: -28
  },
  ARROW: {
    NAME: 'ARROW',
    MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
    MODEL_SCALE: 0.8,
    SPEED: 40,
    KNOCKBACK: 23,
    ENERGY: -30
  },
  SNIPER: {
    NAME: 'SNIPER',
    MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
    MODEL_SCALE: 0.8,
    SPEED: 70,
    KNOCKBACK: 25,
    ENERGY: -25
  }
}

// UI Events
export const UI_EVENT_TYPES = {
    SHOW_CLASS_SELECT: "show-class-select",
    SHOW_PLAYER_LEADERBOARD: "show-player-leaderboard",
    GAME_UI: "game-ui",
    VICTORY: "victory",
    DEFEAT: "defeat",
    PLAYER_DEATH: "player-death",
    PLAYER_ID: "player-id"
  };

  export const UI_BUTTONS = {
    SWITCH_TEAM: "switch-team",
    RESTART_GAME: "restart-game",
    SELECT_CLASS: "select-class",
    SWITCH_MAP: "switch-map"
  }
