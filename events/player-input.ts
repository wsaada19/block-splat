// handle player input events
import {
  PlayerEntityController,
  PlayerEntity,
  type PlayerInput,
  type PlayerCameraOrientation,
  World,
  Vector3,
  type Vector3Like,
} from "hytopia";
import { spawnProjectile } from "../utilities/projectiles";
import { PlayerClass } from "../gameState/player-data";
import TeamManager, { TEAM_COLORS } from "../gameState/team";
import {
  JUMP_COOLDOWN,
  PUNCH_COOLDOWN,
  PUNCH_ENERGY_COST,
  SPRINT_ENERGY_COST,
  PROJECTILES,
  type ProjectileType,
  PUNCH_PLAYER_FORCE,
  PUNCH_FORCE,
  PUNCH_VERTICAL_FORCE,
  RESPAWN_HEIGHT,
  UI_EVENT_TYPES,
  STRENGTH_BOOST_MULTIPLIER,
  MELEE_HIT_DISTANCE,
  SHOOTING_COOLDOWN,
} from "../utilities/gameConfig";
import type CustomPlayerEntity from "../entities/CustomPlayerEntity";
import { globalState } from "../gameState/global-state";

// maps used to add cooldowns on player input
let lastJumpMap = new Map<string, number>();
let lastPunchMap = new Map<string, number>();
let lastShootMap = new Map<string, number>();

export function onTickWithPlayerInput(
  this: PlayerEntityController,
  entity: CustomPlayerEntity,
  input: PlayerInput,
  cameraOrientation: PlayerCameraOrientation,
  _deltaTimeMs: number,
  teamManager: TeamManager,
  world: World
) {
  if (input.ml) {
    handleShooting(entity, input, cameraOrientation, teamManager, world);
  } 
   if (input.mr || input.q) {
    handleMeleeAttack(entity, input, world);
  } else if (input.sp) {
    handleJump(entity, input);
  } else if (input.sh) {
    handleSprint(entity, input);
  } else if (input.e) {
    entity.player.ui.sendData({ type: UI_EVENT_TYPES.SHOW_CLASS_SELECT });
    input.e = false;
  } else if (input.r) {
    showLeaderboard(entity);
    input.r = false;
  } else if (input["1"]) {
    handleClassSelection(entity, "1", input);
  } else if (input["2"]) {
    handleClassSelection(entity, "2", input);
  } else if (input["3"]) {
    handleClassSelection(entity, "3", input);
  } else if (input["4"]) {
    handleClassSelection(entity, "4", input);
  }
}

function handleShooting(
  entity: CustomPlayerEntity,
  input: PlayerInput,
  cameraOrientation: PlayerCameraOrientation,
  teamManager: TeamManager,
  world: World
) {
  if (
    entity.getPlayerClass() === PlayerClass.RUNNER ||
    isPlayerRespawning(entity)
  ) {
    input.ml = false;
    return;
  }

  const lastShoot = lastShootMap.get(entity.player.id);
  if (lastShoot && Date.now() - lastShoot < SHOOTING_COOLDOWN) {
    input.ml = false;
    return;
  }
  lastShootMap.set(entity.player.id, Date.now());

  const direction = calculateShootingDirection(entity, cameraOrientation);
  const bulletOrigin = calculateBulletOrigin(entity, direction);

  const projectileMap: { [key: string]: { type: string; energy: number } } = {
    [PlayerClass.GRENADER]: { type: "BLOB", energy: PROJECTILES.BLOB.ENERGY },
    [PlayerClass.SLINGSHOT]: {
      type: "SLINGSHOT",
      energy: PROJECTILES.SLINGSHOT.ENERGY,
    },
    [PlayerClass.SNIPER]: { type: "SNIPER", energy: PROJECTILES.SNIPER.ENERGY },
  };

  const projectileConfig = projectileMap[entity.getPlayerClass()];
  if (!projectileConfig) return;

  const { type, energy } = projectileConfig;
  if (entity.getStamina() >= Math.abs(energy)) {
    entity.startModelOneshotAnimations(["chuck"]);
    const projectile = spawnProjectile(
      world,
      bulletOrigin,
      direction,
      entity.player.id,
      teamManager,
      type as ProjectileType
    );
    entity.setStamina(energy);
    setTimeout(() => projectile.isSpawned && projectile.despawn(), 2000);
  }
}

function handleMeleeAttack(
  entity: CustomPlayerEntity,
  input: PlayerInput,
  world: World
) {
  const direction = entity.player.camera.facingDirection;
  const raycastResult = world.simulation.raycast(
    entity.position,
    direction,
    MELEE_HIT_DISTANCE,
    { filterExcludeRigidBody: entity.rawRigidBody }
  );
  const lastPunch = lastPunchMap.get(entity.player.id);
  if (lastPunch && Date.now() - lastPunch < PUNCH_COOLDOWN) {
    input.mr = false;
    return;
  }
  lastPunchMap.set(entity.player.id, Date.now());
  let multiplier = 1;
  if (entity.isStrengthBoostActive()) {
    multiplier = STRENGTH_BOOST_MULTIPLIER;
  }

  entity.startModelOneshotAnimations(["simple_interact"]);
  entity.applyImpulse({
    x: direction.x * PUNCH_PLAYER_FORCE,
    y: 0.1,
    z: direction.z * PUNCH_PLAYER_FORCE,
  });

  if (raycastResult?.hitEntity instanceof PlayerEntity) {
    const verticalForce = Math.max(direction.y, 0.7) * PUNCH_VERTICAL_FORCE;
    raycastResult.hitEntity.applyImpulse({
      x: direction.x * PUNCH_FORCE * multiplier,
      y: verticalForce,
      z: direction.z * PUNCH_FORCE * multiplier,
    });
    entity.setStamina(PUNCH_ENERGY_COST);
    globalState
      .getPlayerEntity(raycastResult.hitEntity.player.id)
      .setLastHitBy(entity.player.id);
  }
  input.mr = false;
}

function handleJump(entity: PlayerEntity, input: PlayerInput) {
  const lastJump = lastJumpMap.get(entity.player.id);
  if (lastJump && Date.now() - lastJump < JUMP_COOLDOWN) {
    input.sp = false;
  } else {
    lastJumpMap.set(entity.player.id, Date.now());
  }
}

function handleSprint(entity: CustomPlayerEntity, input: PlayerInput) {
  if (entity.getStamina() > SPRINT_ENERGY_COST) {
    entity.setStamina(-1 * SPRINT_ENERGY_COST);
  } else {
    input.sh = false;
  }
}

function showLeaderboard(entity: CustomPlayerEntity) {
  const redLeaderboard = globalState
    .getPlayersOnTeam(TEAM_COLORS.RED)
    .sort((a, b) => b.getPlayerPoints() - a.getPlayerPoints())
    .map((player) => {
      return {
        name: player.getDisplayName(),
        points: player.getPlayerPoints(),
        kills: player.getKills(),
        deaths: player.getPlayerDeaths(),
      };
    });

  const blueLeaderboard = globalState
    .getPlayersOnTeam(TEAM_COLORS.BLUE)
    .sort((a, b) => b.getPlayerPoints() - a.getPlayerPoints())
    .map((player) => {
      return {
        name: player.getDisplayName(),
        points: player.getPlayerPoints(),
        kills: player.getKills(),
        deaths: player.getPlayerDeaths(),
      };
    });

  entity.player.ui.sendData({
    type: UI_EVENT_TYPES.SHOW_PLAYER_LEADERBOARD,
    redLeaderboard,
    blueLeaderboard,
  });
}

function handleClassSelection(
  entity: CustomPlayerEntity,
  input: "1" | "2" | "3" | "4",
  playerInput: PlayerInput
) {
  const classMap = {
    "1": PlayerClass.RUNNER,
    "2": PlayerClass.GRENADER,
    "3": PlayerClass.SNIPER,
    "4": PlayerClass.SLINGSHOT,
  };

  const selectedClass = classMap[input];
  if (selectedClass) {
    entity.setPlayerClass(selectedClass);
    entity.player.ui.sendData({
      type: UI_EVENT_TYPES.GAME_UI,
      playerClass: selectedClass,
    });
    playerInput[input] = false;
  }
}

function calculateShootingDirection(
  entity: PlayerEntity,
  cameraOrientation: PlayerCameraOrientation
): Vector3 {
  const direction = Vector3.fromVector3Like(entity.directionFromRotation);
  direction.y = Math.sin(cameraOrientation.pitch);

  const cosP = Math.cos(cameraOrientation.pitch);
  direction.x = -direction.x * cosP;
  direction.z = -direction.z * cosP;

  return direction.normalize();
}

function calculateBulletOrigin(
  entity: PlayerEntity,
  direction: Vector3Like
): Vector3Like {
  const bulletOrigin = entity.position;
  bulletOrigin.y += 1.4;
  bulletOrigin.x += direction.x * 1;
  bulletOrigin.z += direction.z * 1;
  return bulletOrigin;
}

function isPlayerRespawning(entity: PlayerEntity) {
  return entity.position.y === RESPAWN_HEIGHT;
}
