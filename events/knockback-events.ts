// Handles player - projectile collisions applying knockback to the player when applicable
import { PlayerEntity, type Entity, Audio } from "hytopia";
import type { PlayerDataManager } from "../gameState/player-data";
import { PROJECTILES, STRENGTH_BOOST_MULTIPLIER } from "../utilities/gameConfig";
import type TeamManager from "../gameState/team";
import { FRIENDLY_FIRE_DISABLED } from "../utilities/gameConfig";

export function knockBackCollisionHandler(
  projectile: Entity,
  otherEntity: Entity,
  started: boolean,
  tag: string,
  playerDataManager: PlayerDataManager,
  teams: TeamManager
) {
  // only allow if it's a different player who isn't respawning and the game is active
  if (!(otherEntity instanceof PlayerEntity) || otherEntity.player.id === tag)
    return;
  const playerStats = playerDataManager.getPlayer(otherEntity.player.id);
  if (
    playerStats.invincible ||
    otherEntity.position.y > 40 ||
    (FRIENDLY_FIRE_DISABLED &&
      teams.getPlayerTeam(tag) === teams.getPlayerTeam(otherEntity.player.id))
  )
    return;

  if (started && projectile.isSpawned) {
    // tag player so we can reward kills
    if (playerStats) {
      playerStats.lastHitBy = tag;
    }

    let multiplier = 1;
    if(playerDataManager.isStrengthBoostActive(tag)) {
      multiplier = STRENGTH_BOOST_MULTIPLIER;
    }

    // Calculate direction from projectile to player
    const dx = otherEntity.position.x - projectile.position.x;
    const dy = otherEntity.position.y - projectile.position.y;
    const dz = otherEntity.position.z - projectile.position.z;

    // Normalize the direction vector
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const normalizedDx = dx / length;
    const normalizedDy = dy / length;
    const normalizedDz = dz / length;

    // Calculate impact force based on relative velocity
    const impactForce =
      PROJECTILES[projectile.name as keyof typeof PROJECTILES].KNOCKBACK;
    const verticalForce = Math.max(normalizedDy, 0.5) * impactForce * 0.8;

    // Add some jitter to the knockback to make it more chaotic
    const jitter = 0.5 + (Math.random() * 0.1 - 0.1);

    otherEntity.applyImpulse({
      x: normalizedDx * impactForce * jitter * multiplier,
      y: verticalForce,
      z: normalizedDz * impactForce * jitter * multiplier,
    });

    // immediately despawn slingshot projectiles
    if (projectile.name === PROJECTILES.SLINGSHOT.NAME) {
      projectile.despawn();
    }

    // Play hit sound
    if (otherEntity.world) {
      new Audio({
        uri: "audio/sfx/player/bow-hit.mp3",
        volume: 0.5,
        playbackRate: 1.5,
        position: otherEntity.position,
        referenceDistance: 10,
      }).play(otherEntity.world);
    }
  }
}
