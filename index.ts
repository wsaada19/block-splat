import {
  startServer,
  Audio,
  PlayerEntity,
  World,
  type Vector3Like,
  RigidBodyType,
  Entity,
  type QuaternionLike,
  BlockType,
  Vector3,
  PlayerEntityController,
  type PlayerInput,
  type PlayerCameraOrientation,
  Player,
  PlayerUI
} from 'hytopia'
import {
  BLOCK_STATE,
  BLANK_BLOCK_ID,
  RED_BLOCK_ID,
  BLUE_BLOCK_ID,
  coloredBlockData,
  blockIds,
  getStateFromTag,
  setBlockState,
  getBlockIdFromState
} from './scripts/block-utils'

import Game from './scripts/game'
import worldMap from './assets/maps/boilerplate.json'
import { PlayerClass, PlayerDataManager } from './scripts/player-data'
import TeamManager, { TEAM_COLOR_STRINGS, TEAM_COLORS } from './scripts/team'
import {
  knockBackCollisionHandler,
  PROJECTILES,
  type ProjectileType
} from './scripts/collision-handlers'

const TIME_LIMIT = 60 * 5 // 5 minutes
const DEFAULT_SPAWN = { x: -10, y: 15, z: -10 }
const blockStateMap = new Map<string, BLOCK_STATE>()
const SHOOTING_COOLDOWN = 250;
const JUMP_COOLDOWN = 1000;

startServer((world) => {
  const playerDataManager = new PlayerDataManager()

  const teamManager = new TeamManager(
    ['Blue Bandits', 'Red Raiders'],
    [
      { x: -10, y: 15, z: -10 },
      { x: 10, y: 15, z: 10 }
    ],
    playerDataManager
  )
  const game = new Game(
    world,
    teamManager,
    playerDataManager,
    TIME_LIMIT,
    blockStateMap
  )

  world.onPlayerJoin = (player) =>
    onPlayerJoin(player, world, teamManager, game, playerDataManager)

  world.onPlayerLeave = (player) => {
    teamManager.removePlayer(player.id)
    playerDataManager.removePlayer(player.id)
    world.entityManager
      .getPlayerEntitiesByPlayer(player)
      .forEach((entity) => entity.despawn())
  }

  coloredBlockData.forEach((blockData) => {
    const block = world.blockTypeRegistry.registerGenericBlockType({
      id: blockData.id,
      textureUri: blockData.textureUri,
      name: blockData.name
    })

    block.onEntityCollision = (
      type: BlockType,
      entity: Entity,
      started: boolean,
      colliderHandleA: number,
      colliderHandleB: number
    ) =>
      onBlockHit(
        type,
        entity,
        started,
        colliderHandleA,
        colliderHandleB,
        world,
        game,
        playerDataManager,
        teamManager
      )
  })

  world.loadMap(worldMap)

  world.chatManager.registerCommand('/start-game', () => {
    world.chatManager.sendBroadcastMessage('Starting game...')
    game.startGame()
  })

  world.chatManager.registerCommand('/set-name', (player, args) => {
    playerDataManager.setPlayerName(player.id, args[0])
    world.chatManager.sendPlayerMessage(player, `Name set to ${args[0]}`)
  })

  // Play some peaceful ambient music
  new Audio({
    uri: 'audio/music/hytopia-main.mp3',
    loop: true,
    volume: 0.1
  }).play(world)
})

function handlePlayerDeath(
  entity: PlayerEntity,
  world: World,
  teamManager: TeamManager,
  playerDataManager: PlayerDataManager
) {
  if (entity.position.y === 50) return // dont respawn if player is already dead
  entity.player.ui.sendData({
    type: 'player-death',
    message: 'You fell off the map!'
  })

  const playerStats = playerDataManager.getPlayer(entity.player.id)
  if (playerStats) {
    playerStats.playerDeaths++
    if (playerStats.lastHitBy) {
      playerDataManager.addKill(playerStats.lastHitBy)
      playerDataManager.setLastHitBy(entity.player.id, '')
    }
  }

  // Make player spectator during respawn
  entity.setPosition({ x: 0, y: 50, z: 0 })
  if (entity.rawRigidBody) {
    entity.rawRigidBody.setEnabled(false)
  }

  setTimeout(() => {
    respawnPlayer(entity as PlayerEntity, world, teamManager)
  }, 5000)
}

function respawnPlayer(
  entity: PlayerEntity,
  world: World,
  teamManager: TeamManager
) {
  // Get team spawn point
  const team = teamManager.getPlayerTeam(entity.player.id)
  const spawn = teamManager.getTeamSpawn(team ?? 0) ?? DEFAULT_SPAWN

  // Re-enable physics and move to spawn
  if (entity.rawRigidBody) {
    entity.rawRigidBody.setEnabled(true)
  }
  entity.setPosition(spawn)
}

function onPlayerJoin(
  player: Player,
  world: World,
  teamManager: TeamManager,
  game: Game,
  playerDataManager: PlayerDataManager
) {
  const playerEntity = new PlayerEntity({
    player,
    name: 'Player',
    modelUri: 'models/players/player.gltf',
    modelLoopedAnimations: ['idle'],
    modelScale: 0.5
  })

  playerEntity.spawn(world, DEFAULT_SPAWN)
  playerDataManager.setPlayerClass(player.id, PlayerClass.SNIPER)
  playerDataManager.setPlayerName(player.id, player.username)
  player.camera.setFov(80)
  player.camera.setOffset({ x: 0, y: 1, z: 0 })

  teamManager.addPlayerToMinTeam(player.id)

  playerEntity.onTick = (entity: Entity) => {
    if (entity instanceof PlayerEntity && entity.position.y < -8) {
      handlePlayerDeath(
        entity as PlayerEntity,
        world,
        teamManager,
        playerDataManager
      )
    }
  }

  playerEntity.controller!.onTickWithPlayerInput = function (
    entity,
    input,
    cameraOrientation,
    deltaTimeMs
  ) {
    if (
      playerEntity.controller &&
      playerEntity.controller instanceof PlayerEntityController
    ) {
      onTickWithPlayerInput.call(
        playerEntity.controller,
        entity,
        input,
        cameraOrientation,
        deltaTimeMs,
        teamManager,
        playerDataManager,
        world
      )
    }
  }

  player.ui.load('ui/hud.html')

  player.ui.onData = (
    playerUI: PlayerUI,
    data: { button?: string; class?: string }
  ) => {
    if (!data.button) return

    if (data.button === 'switch-team') {
      teamManager.switchTeam(playerUI.player.id)
    } else if (data.button === 'restart-game') {
      game.restartGame()
    } else if (data.button === 'select-class' && data.class) {
      playerDataManager.setPlayerClass(
        playerUI.player.id,
        data.class as PlayerClass
      )
    }
  }

  world.chatManager.sendPlayerMessage(player, 'Welcome! Use WASD to move around.')
  world.chatManager.sendPlayerMessage(player, 'Press space to jump.')
  world.chatManager.sendPlayerMessage(player, 'Hold shift to sprint.')
  world.chatManager.sendPlayerMessage(player, 'Press left mouse button to shoot.')
  world.chatManager.sendPlayerMessage(player, 'Press right mouse button to punch.')
  world.chatManager.sendPlayerMessage(player, 'Press e to select your class.')
  world.chatManager.sendPlayerMessage(player, 'Press r to view the leaderboard.')
  world.chatManager.sendPlayerMessage(player, 'Type /set-name to set your name.')
}

function onBlockHit(
  type: BlockType,
  entity: Entity,
  started: boolean,
  colliderHandleA: number,
  colliderHandleB: number,
  world: World,
  game: Game,
  playerDataManager: PlayerDataManager,
  teamManager: TeamManager
) {
  if (
    entity.name !== 'Player' &&
    started &&
    blockIds.includes(type.id) &&
    entity.tag
  ) {
    const contactManifolds = world.simulation.getContactManifolds(
      colliderHandleA,
      colliderHandleB
    )
    const tag = entity.tag
    const color = teamManager.getPlayerColor(tag)
    let contactPoint: Vector3Like | undefined

    // Find first contact point
    for (const contactManifold of contactManifolds) {
      if (contactManifold.contactPoints.length > 0) {
        contactPoint = contactManifold.contactPoints[0]
        break
      }
    }

    let position = entity.position
    if (contactPoint) {
      // The contact point is in world space, round to nearest block coordinates
      position = {
        x: Math.round(contactPoint.x),
        y: Math.floor(contactPoint.y),
        z: Math.round(contactPoint.z)
      }

      const maxBlocks = entity.name === PROJECTILES.ARROW.NAME ? 2 : 14
      let blocksColored = 0
      const newState = getStateFromTag(color ?? 'WHITE')
      const blockId =
        newState === BLOCK_STATE.BLUE
          ? BLUE_BLOCK_ID
          : newState === BLOCK_STATE.RED
            ? RED_BLOCK_ID
            : BLANK_BLOCK_ID

      // Spiral outward from center, checking closest blocks first
      const checkOrder = [
        [0, 0, 0], // Center block
        [0, 1, 0], // Above
        [0, -1, 0], // Below
        [1, 0, 0], // East
        [-1, 0, 0], // West
        [0, 0, 1], // North
        [0, 0, -1], // South
        // Diagonals if needed for blob
        [1, 0, 1],
        [-1, 0, 1],
        [1, 0, -1],
        [-1, 0, -1],
        [-1, -1, -1],
        [1, 1, 1]
      ]

      for (const [dx, dy, dz] of checkOrder) {
        if (blocksColored >= maxBlocks) break

        const blockPos = {
          x: position.x + dx,
          y: position.y + dy,
          z: position.z + dz
        }

        // Skip if not a valid block
        if (!blockIds.includes(world.chunkLattice.getBlockId(blockPos))) {
          continue
        }

        const blockState = world.chunkLattice.getBlockId(blockPos)
        if (blockState === getBlockIdFromState(newState)) continue

        // Update scores in one pass
        if (blockState === BLOCK_STATE.BLUE) {
          game.changeScore(TEAM_COLORS.BLUE, -1)
        } else if (blockState === BLOCK_STATE.RED) {
          game.changeScore(TEAM_COLORS.RED, -1)
        }

        if (newState === BLOCK_STATE.BLUE) {
          game.changeScore(TEAM_COLORS.BLUE, 1)
        } else if (newState === BLOCK_STATE.RED) {
          game.changeScore(TEAM_COLORS.RED, 1)
        }

        world.chunkLattice.setBlock(blockPos, blockId)
        setBlockState(blockStateMap, blockPos, newState)

        blocksColored++
      }
      if (game.isGameRunning) {
        playerDataManager.updatePlayerPoints(tag, blocksColored)
      }

      const audio = new Audio({
        uri: 'audio/sfx/liquid/splash-01.mp3',
        playbackRate: 2,
        volume: 1,
        referenceDistance: 20,
        position: position
      })

      audio.play(world)
      setTimeout(() => {
        world.audioManager.unregisterAudio(audio)
      }, 2000)
      entity.despawn()
    }
  }

  if (entity instanceof PlayerEntity && started && blockIds.includes(type.id)) {
    const player = entity.player
    const playerClass = playerDataManager.getPlayerClass(player.id)
    if (playerClass === PlayerClass.RUNNER) {
      const teamColor = teamManager.getPlayerColor(player.id)
      const position = entity.position
      const blockPos = {
        x: Math.floor(position.x),
        y: Math.floor(position.y - 1), // Block below player
        z: Math.floor(position.z)
      }

      const blockState = world.chunkLattice.getBlockId(blockPos)
      const newState = getStateFromTag(teamColor)
      const blockId =
        newState === BLOCK_STATE.BLUE ? BLUE_BLOCK_ID : RED_BLOCK_ID
      if (blockState !== blockId) {
        // dont do anything if block is air
        if (blockState === 0) {
          return
        }
        // Remove point from old team if block was colored
        if (blockState === BLOCK_STATE.BLUE) {
          game.changeScore(TEAM_COLORS.BLUE, -1)
        } else if (blockState === BLOCK_STATE.RED) {
          game.changeScore(TEAM_COLORS.RED, -1)
        }

        // Add point to new team
        game.changeScore(newState, 1)
        playerDataManager.updatePlayerPoints(player.id, 1)

        // Update block
        world.chunkLattice.setBlock(blockPos, blockId)
        setBlockState(blockStateMap, blockPos, newState)
      }
    }
  }
}

let lastJumpMap = new Map<string, number>()
let lastShotMap = new Map<string, number>()

function onTickWithPlayerInput(
  this: PlayerEntityController,
  entity: PlayerEntity,
  input: PlayerInput,
  cameraOrientation: PlayerCameraOrientation,
  _deltaTimeMs: number,
  teamManager: TeamManager,
  playerDataManager: PlayerDataManager,
  world: World
) {
  if (!entity.world) return
  if (input.ml) {
    const playerClass = playerDataManager.getPlayerClass(entity.player.id)

    if (!playerClass || playerClass === PlayerClass.RUNNER) return
    const lastShot = lastShotMap.get(entity.player.id)
    if (lastShot && Date.now() - lastShot < SHOOTING_COOLDOWN) {
      input.ml = false
      return
    } else {
      lastShotMap.set(entity.player.id, Date.now())
    }

    const world = entity.world
    const direction = Vector3.fromVector3Like(entity.directionFromRotation)

    direction.y = Math.sin(cameraOrientation.pitch)

    // Adjust horizontal components based on pitch
    const cosP = Math.cos(cameraOrientation.pitch)
    direction.x = -direction.x * cosP
    direction.z = -direction.z * cosP

    // Normalize the direction vector to unit length
    direction.normalize()

    entity.startModelOneshotAnimations(['simple_interact'])

    // Adjust bullet origin roughly for camera offset so crosshair is accurate
    const bulletOrigin = entity.position
    bulletOrigin.y += 1.4
    bulletOrigin.x += direction.x * 1
    bulletOrigin.z += direction.z * 1

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
        'BLOB',
        playerDataManager
      )
      playerDataManager.updateStamina(entity.player.id, PROJECTILES.BLOB.ENERGY)
      setTimeout(() => bullet.isSpawned && bullet.despawn(), 2000)
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
        'ARROW',
        playerDataManager
      )
      playerDataManager.updateStamina(
        entity.player.id,
        PROJECTILES.ARROW.ENERGY
      )
      setTimeout(() => arrow.isSpawned && arrow.despawn(), 2000)
    }
  } else if (input.mr) {
    const direction = entity.player.camera.facingDirection
    const length = 3.5

    const raycastResult = world.simulation.raycast(
      entity.position,
      direction,
      length,
      {
        filterExcludeRigidBody: entity.rawRigidBody
      }
    )
    if (raycastResult?.hitEntity?.name === 'Player') {
      // knockback player
      const verticalForce = Math.max(direction.y, 0.7) * 15;
      entity.startModelOneshotAnimations(['simple_interact'])
      // raycastResult.hitEntity.startModelOneshotAnimations(['jump'])
      raycastResult.hitEntity.applyImpulse({
        x: direction.x * 12,
        y: verticalForce,
        z: direction.z * 12
      })
      playerDataManager.updateStamina(entity.player.id, -10)
      input.mr = false
    }
  } else if (input.sp) {
    // don't let player spam jumping due to some weird behavior
    const lastJump = lastJumpMap.get(entity.player.id)
    if (lastJump && Date.now() - lastJump < JUMP_COOLDOWN) {
      input.sp = false
    } else {
      lastJumpMap.set(entity.player.id, Date.now())
    }
  } else if (input.sh) {
    //decrease stamina
    if (playerDataManager.getPlayerStamina(entity.player.id) > 5) {
      playerDataManager.updateStamina(entity.player.id, -1)
    } else {
      input.sh = false
    }
  } else if (input.e) {
    entity.player.ui.sendData({
      type: 'show-class-select'
    })
    input.e = false
  } else if (input.r) {
    const redLeaderboard = teamManager.getTeamPlayerData(TEAM_COLORS.RED).sort((a, b) => b.playerPoints - a.playerPoints)
    const blueLeaderboard = teamManager.getTeamPlayerData(TEAM_COLORS.BLUE).sort((a, b) => b.playerPoints - a.playerPoints)
    entity.player.ui.sendData({
      type: 'show-player-leaderboard',
      redLeaderboard: redLeaderboard,
      blueLeaderboard: blueLeaderboard
    })
    input.r = false
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

function spawnProjectile(
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
