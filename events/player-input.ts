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
import { PlayerDataManager, PlayerClass } from "../gameState/player-data";
import TeamManager, { TEAM_COLORS } from "../gameState/team";
import {
  SHOOTING_COOLDOWN,
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
} from "../utilities/gameConfig";

// maps used to add cooldowns on player input
let lastJumpMap = new Map<string, number>();
let lastShotMap = new Map<string, number>();
let lastPunchMap = new Map<string, number>();

export function onTickWithPlayerInput(
  this: PlayerEntityController,
  entity: PlayerEntity,
  input: PlayerInput,
  cameraOrientation: PlayerCameraOrientation,
  _deltaTimeMs: number,
  teamManager: TeamManager,
  playerDataManager: PlayerDataManager,
  world: World
) {
  if (!entity.world) return;

  // Find the first active input

  if (input.ml) {
    handleShooting(
      entity,
      input,
      cameraOrientation,
      playerDataManager,
      teamManager,
      world
    );
  } else if (input.mr || input.q) {
    handleMeleeAttack(entity, input, playerDataManager, world);
  } else if (input.sp) {
    handleJump(entity, input);
  } else if (input.sh) {
    handleSprint(entity, input, playerDataManager);
  } else if (input.e) {
    entity.player.ui.sendData({ type: UI_EVENT_TYPES.SHOW_CLASS_SELECT });
    input.e = false;
  } else if (input.r) {
    showLeaderboard(entity, teamManager);
    input.r = false;
  } else if (input["1"]) {
    handleClassSelection(entity, "1", input, playerDataManager);
  } else if (input["2"]) {
    handleClassSelection(entity, "2", input, playerDataManager);
  } else if (input["3"]) {
    handleClassSelection(entity, "3", input, playerDataManager);
  } else if (input["4"]) {
    handleClassSelection(entity, "4", input, playerDataManager);
  }
}

function handleShooting(
  entity: PlayerEntity,
  input: PlayerInput,
  cameraOrientation: PlayerCameraOrientation,
  playerDataManager: PlayerDataManager,
  teamManager: TeamManager,
  world: World
) {
  const playerData = playerDataManager.getPlayer(entity.player.id);

  if (
    !playerData ||
    playerData.class === PlayerClass.RUNNER ||
    isPlayerRespawning(entity)
  ) {
    input.ml = false;
    return;
  }

  const lastShot = lastShotMap.get(entity.player.id);
  if (lastShot && Date.now() - lastShot < SHOOTING_COOLDOWN) {
    input.ml = false;
    return;
  }

  lastShotMap.set(entity.player.id, Date.now());
  const direction = calculateShootingDirection(entity, cameraOrientation);
  const bulletOrigin = calculateBulletOrigin(entity, direction);

  const projectileMap = {
    [PlayerClass.GRENADER]: { type: "BLOB", energy: PROJECTILES.BLOB.ENERGY },
    [PlayerClass.SLINGSHOT]: {
      type: "ARROW",
      energy: PROJECTILES.ARROW.ENERGY,
    },
    [PlayerClass.SNIPER]: { type: "SNIPER", energy: PROJECTILES.SNIPER.ENERGY },
  };

  const projectileConfig = projectileMap[playerData.class];
  if (!projectileConfig) return;

  const { type, energy } = projectileConfig;
  if (playerData.stamina >= Math.abs(energy)) {
    entity.startModelOneshotAnimations(["chuck"]);
    const projectile = spawnProjectile(
      world,
      bulletOrigin,
      direction,
      entity.player.id,
      teamManager,
      type as ProjectileType,
      playerDataManager
    );
    playerData.stamina + -energy;
    setTimeout(() => projectile.isSpawned && projectile.despawn(), 2000);
  }
}

function handleMeleeAttack(
  entity: PlayerEntity,
  input: PlayerInput,
  playerDataManager: PlayerDataManager,
  world: World
) {
  const direction = entity.player.camera.facingDirection;
  const raycastResult = world.simulation.raycast(
    entity.position,
    direction,
    3.5,
    { filterExcludeRigidBody: entity.rawRigidBody }
  );
  const lastPunch = lastPunchMap.get(entity.player.id);
  if (lastPunch && Date.now() - lastPunch < PUNCH_COOLDOWN) {
    input.mr = false;
    return;
  }
  lastPunchMap.set(entity.player.id, Date.now());

  entity.startModelOneshotAnimations(["simple_interact"]);
  entity.applyImpulse({
    x: direction.x * PUNCH_PLAYER_FORCE,
    y: 0,
    z: direction.z * PUNCH_PLAYER_FORCE,
  });

  if (raycastResult?.hitEntity instanceof PlayerEntity) {
    const verticalForce = Math.max(direction.y, 0.7) * PUNCH_VERTICAL_FORCE;
    raycastResult.hitEntity.applyImpulse({
      x: direction.x * PUNCH_FORCE,
      y: verticalForce,
      z: direction.z * PUNCH_FORCE,
    });
    playerDataManager.updateStamina(entity.player.id, -PUNCH_ENERGY_COST);
    playerDataManager.setLastHitBy(
      raycastResult.hitEntity.player.id,
      entity.player.id
    );
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

function handleSprint(
  entity: PlayerEntity,
  input: PlayerInput,
  playerDataManager: PlayerDataManager
) {
  const player = playerDataManager.getPlayer(entity.player.id);
  if (player.stamina > SPRINT_ENERGY_COST) {
    player.stamina -= SPRINT_ENERGY_COST;
  } else {
    input.sh = false;
  }
}

function showLeaderboard(entity: PlayerEntity, teamManager: TeamManager) {
  const redLeaderboard = teamManager
    .getTeamPlayerData(TEAM_COLORS.RED)
    .sort((a, b) => b.playerPoints - a.playerPoints);
  const blueLeaderboard = teamManager
    .getTeamPlayerData(TEAM_COLORS.BLUE)
    .sort((a, b) => b.playerPoints - a.playerPoints);

  entity.player.ui.sendData({
    type: UI_EVENT_TYPES.SHOW_PLAYER_LEADERBOARD,
    redLeaderboard,
    blueLeaderboard,
  });
}

function handleClassSelection(
  entity: PlayerEntity,
  input: "1" | "2" | "3" | "4",
  playerInput: PlayerInput,
  playerDataManager: PlayerDataManager
) {
  const classMap = {
    "1": PlayerClass.RUNNER,
    "2": PlayerClass.GRENADER,
    "3": PlayerClass.SNIPER,
    "4": PlayerClass.SLINGSHOT,
  };

  const selectedClass = classMap[input];
  if (selectedClass) {
    playerDataManager.setPlayerClass(entity.player.id, selectedClass);
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
