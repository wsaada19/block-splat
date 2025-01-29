import { type Vector3Like, type QuaternionLike, World, Entity, RigidBodyType, BlockType, Audio, PlayerEntity } from "hytopia"
import { knockBackCollisionHandler } from "../events/collision-events"
import { blockIds } from "./block-utils"
import type { PlayerDataManager } from "../gameState/player-data"
import TeamManager, { TEAM_COLOR_STRINGS, TEAM_COLORS } from "../gameState/team"

export type ProjectileType = 'BLOB' | 'ARROW'

export const PROJECTILES = {
  BLOB: {
    NAME: 'Blob',
    MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
    MODEL_SCALE: 1.5,
    SPEED: 30,
    KNOCKBACK: 30,
    ENERGY: -40
  },
  ARROW: {
    NAME: 'Arrow',
    MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
    MODEL_SCALE: 0.8,
    SPEED: 40,
    KNOCKBACK: 30,
    ENERGY: -15
  }
}

function getRotationFromDirection(direction: Vector3Like): QuaternionLike {
  // Calculate yaw (rotation around Y-axis)
  const yaw = Math.atan2(-direction.x, -direction.z)

  // Calculate pitch (rotation around X-axis)
  const pitch = Math.asin(direction.y)

  // Pre-calculate common terms
  const halfYaw = yaw * 0.5
  const halfPitch = pitch * 0.5
  const cosHalfYaw = Math.cos(halfYaw)
  const sinHalfYaw = Math.sin(halfYaw)
  const cosHalfPitch = Math.cos(halfPitch)
  const sinHalfPitch = Math.sin(halfPitch)

  // Convert to quaternion
  return {
    x: sinHalfPitch * cosHalfYaw,
    y: sinHalfYaw * cosHalfPitch,
    z: sinHalfYaw * sinHalfPitch,
    w: cosHalfPitch * cosHalfYaw
  }
}

export function spawnProjectile(
  world: World,
  coordinate: Vector3Like,
  direction: Vector3Like,
  tag: string,
  teamManager: TeamManager,
  type: ProjectileType,
  playerDataManager: PlayerDataManager
) {
  // Spawn a projectileEntity when the player shoots.
  const color = teamManager.getPlayerColor(tag)
  const projectile = PROJECTILES[type]
  const projectileEntity = new Entity({
    name: projectile.NAME,
    modelUri: projectile.MODEL_URI,
    modelScale: projectile.MODEL_SCALE,
    tintColor:
      color === TEAM_COLOR_STRINGS[TEAM_COLORS.RED]
        ? { r: 255, g: 0, b: 0 }
        : { r: 0, g: 0, b: 255 },
    rigidBodyOptions: {
      type: RigidBodyType.DYNAMIC, // Kinematic means entity's rigid body will not be affected by physics. KINEMATIC_VELOCITY means the entity is moved by setting velocity.
      linearVelocity: {
        x: direction.x * projectile.SPEED,
        y: direction.y * projectile.SPEED,
        z: direction.z * projectile.SPEED
      },
      rotation: getRotationFromDirection(direction) // Get the rotation from the direction vector so it's facing the right way we shot it
    },
    tag: tag
  })

  projectileEntity.onEntityCollision = (
    projectileEntity: Entity,
    otherEntity: Entity,
    started: boolean
  ) => {
    knockBackCollisionHandler(
      projectileEntity,
      otherEntity,
      started,
      tag,
      playerDataManager
    )
  }

  projectileEntity.onBlockCollision = (
    projectileEntity: Entity,
    block: BlockType,
    started: boolean
  ) => {
    // If the projectileEntity hits a block, despawn it
    if (started && !blockIds.includes(block.id)) {
      projectileEntity.despawn()
    }
  }

  projectileEntity.spawn(world, coordinate)

  // SWOOSH!
  const audio = new Audio({
    uri: 'audio/sfx/player/player-swing-woosh.mp3',
    playbackRate: 2,
    volume: 0.5,
    referenceDistance: 20,
    position: coordinate
  })

  audio.play(world)
  setTimeout(() => {
    world.audioManager.unregisterAudio(audio)
  }, 2000)

  return projectileEntity
}