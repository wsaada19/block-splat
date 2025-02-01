import {
  PlayerEntityController,
  PlayerEntity,
  type PlayerInput,
  type PlayerCameraOrientation,
  World,
  Vector3,
} from "hytopia";
import { spawnProjectile, PROJECTILES } from "../utilities/projectiles";
import { PlayerDataManager, PlayerClass } from "../gameState/player-data";
import TeamManager, { TEAM_COLORS } from "../gameState/team";

const SHOOTING_COOLDOWN = 250;
const JUMP_COOLDOWN = 500;
const UI_EVENT_TYPES = {
  SHOW_CLASS_SELECT: "show-class-select",
  SHOW_PLAYER_LEADERBOARD: "show-player-leaderboard",
};

let lastJumpMap = new Map<string, number>();
let lastShotMap = new Map<string, number>();

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
  if (input.ml) {
    const playerClass = playerDataManager.getPlayerClass(entity.player.id);

    if (
      !playerClass ||
      playerClass === PlayerClass.RUNNER ||
      isPlayerRespawning(entity)
    )
      return;
    const lastShot = lastShotMap.get(entity.player.id);
    if (lastShot && Date.now() - lastShot < SHOOTING_COOLDOWN) {
      input.ml = false;
      return;
    } else {
      lastShotMap.set(entity.player.id, Date.now());
    }

    const world = entity.world;
    const direction = Vector3.fromVector3Like(entity.directionFromRotation);

    direction.y = Math.sin(cameraOrientation.pitch);

    // Adjust horizontal components based on pitch
    const cosP = Math.cos(cameraOrientation.pitch);
    direction.x = -direction.x * cosP;
    direction.z = -direction.z * cosP;

    // Normalize the direction vector to unit length
    direction.normalize();

    entity.startModelOneshotAnimations(["throw"]);

    // Adjust bullet origin roughly for camera offset so crosshair is accurate
    const bulletOrigin = entity.position;
    bulletOrigin.y += 1.4;
    bulletOrigin.x += direction.x * 1;
    bulletOrigin.z += direction.z * 1;

    if (
      playerClass === PlayerClass.GRENADER &&
      playerDataManager.getPlayerStamina(entity.player.id) >= 30
    ) {
      const bullet = spawnProjectile(
        world,
        bulletOrigin,
        direction,
        entity.player.id,
        teamManager,
        "BLOB",
        playerDataManager
      );
      playerDataManager.updateStamina(
        entity.player.id,
        PROJECTILES.BLOB.ENERGY
      );
      setTimeout(() => bullet.isSpawned && bullet.despawn(), 2000);
    } else if (
      playerClass === PlayerClass.SNIPER &&
      playerDataManager.getPlayerStamina(entity.player.id) >= 15
    ) {
      const arrow = spawnProjectile(
        world,
        bulletOrigin,
        direction,
        entity.player.id,
        teamManager,
        "ARROW",
        playerDataManager
      );
      playerDataManager.updateStamina(
        entity.player.id,
        PROJECTILES.ARROW.ENERGY
      );
      setTimeout(() => arrow.isSpawned && arrow.despawn(), 2000);
    }
  } else if (input.q || input.mr) {
    const direction = entity.player.camera.facingDirection;
    const length = 3.5;

    const raycastResult = world.simulation.raycast(
      entity.position,
      direction,
      length,
      {
        filterExcludeRigidBody: entity.rawRigidBody,
      }
    );
    entity.startModelOneshotAnimations(["simple_interact"]);
    if (raycastResult?.hitEntity?.name === "Player") {
      // knockback player
      const verticalForce = Math.max(direction.y, 0.7) * 15;
      // raycastResult.hitEntity.startModelOneshotAnimations(['jump'])
      raycastResult.hitEntity.applyImpulse({
        x: direction.x * 12,
        y: verticalForce,
        z: direction.z * 12,
      });
      playerDataManager.updateStamina(entity.player.id, -10);
      input.mr = false;
    }
  } else if (input.sp) {
    // don't let player spam jumping due to some weird behavior
    const lastJump = lastJumpMap.get(entity.player.id);
    if (lastJump && Date.now() - lastJump < JUMP_COOLDOWN) {
      input.sp = false;
    } else {
      lastJumpMap.set(entity.player.id, Date.now());
    }
  } else if (input.sh) {
    //decrease stamina for sprinting
    if (playerDataManager.getPlayerStamina(entity.player.id) > 5) {
      playerDataManager.updateStamina(entity.player.id, -1);
    } else {
      input.sh = false;
    }
  } else if (input.e) {
    entity.player.ui.sendData({
      type: UI_EVENT_TYPES.SHOW_CLASS_SELECT,
    });
    input.e = false;
  } else if (input.r) {
    const redLeaderboard = teamManager
      .getTeamPlayerData(TEAM_COLORS.RED)
      .sort((a, b) => b.playerPoints - a.playerPoints);
    const blueLeaderboard = teamManager
      .getTeamPlayerData(TEAM_COLORS.BLUE)
      .sort((a, b) => b.playerPoints - a.playerPoints);
    entity.player.ui.sendData({
      type: UI_EVENT_TYPES.SHOW_PLAYER_LEADERBOARD,
      redLeaderboard: redLeaderboard,
      blueLeaderboard: blueLeaderboard,
    });
    input.r = false;
  }
}

const isPlayerRespawning = (entity: PlayerEntity) => {
  return entity.position.y == 45;
};
