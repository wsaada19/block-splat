import { PlayerEntity, type Entity, Audio } from 'hytopia'
import type { PlayerDataManager } from '../gameState/player-data'
import { PROJECTILES } from '../utilities/projectiles'

export const knockBackCollisionHandler = (
  projectile: Entity,
  otherEntity: Entity,
  started: boolean,
  tag: string,
  playerDataManager: PlayerDataManager
) => {
  // IF the projectile hits another player that isn't themselves
  // ALLOW FRIENDLY FIRE because it's funnier
  if (
    !(otherEntity instanceof PlayerEntity) ||
    otherEntity.player.id === tag || playerDataManager.getPlayerRespawning(otherEntity.player.id)
  ) return;

  if (started && projectile.isSpawned) {
    // tag player so we can reward kills
    const playerStats = playerDataManager.getPlayer(otherEntity.player.id)
    if (playerStats) {
      playerStats.lastHitBy = tag
    }
    // Calculate direction from projectile to player
    const dx = otherEntity.position.x - projectile.position.x
    const dy = otherEntity.position.y - projectile.position.y
    const dz = otherEntity.position.z - projectile.position.z

    // Normalize the direction vector
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const normalizedDx = dx / length
    const normalizedDy = dy / length
    const normalizedDz = dz / length

    // Calculate impact force based on relative velocity
    const impactForce =
      projectile.name === PROJECTILES.BLOB.NAME
        ? PROJECTILES.BLOB.KNOCKBACK
        : PROJECTILES.ARROW.KNOCKBACK
    const verticalForce = Math.max(normalizedDy, 0.7) * impactForce * 0.8
    // Add some jitter to the knockback to make it more chaotic
    const jitter = 0.5 + (Math.random() * 0.1 - 0.1)

    if (projectile.name === PROJECTILES.BLOB.NAME) {
      otherEntity.applyImpulse({
        x: normalizedDx * impactForce * jitter,
        y: verticalForce, // Ensure some upward force
        z: normalizedDz * impactForce * jitter
      })
    } else if (projectile.name === PROJECTILES.ARROW.NAME) {
      otherEntity.applyImpulse({
        x: normalizedDx * impactForce * jitter,
        y: verticalForce, // Increased vertical force
        z: normalizedDz * impactForce * jitter
      })
      projectile.despawn()
    }

    // Play hit sound
    if (otherEntity.world) {
      new Audio({
        uri: 'audio/sfx/player/bow-hit.mp3',
        volume: 0.5,
        playbackRate: 1.5,
        position: otherEntity.position,
        referenceDistance: 20
      }).play(otherEntity.world)
    }
  }
}
