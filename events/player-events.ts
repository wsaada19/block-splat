// This file contains the player join, death, and respawn events
import { Player, World, PlayerEntity, Entity, PlayerEntityController, PlayerUI } from "hytopia"
import { onTickWithPlayerInput } from "./player-input"
import type Game from "../gameState/game"
import { type PlayerDataManager, PlayerClass } from "../gameState/player-data"
import type TeamManager from "../gameState/team"
import type GameMap from "../gameState/map"
export const DEFAULT_SPAWN = { x: -10, y: 15, z: -10 }


export function onPlayerJoin(
  player: Player,
  world: World,
  teamManager: TeamManager,
  game: Game,
  playerDataManager: PlayerDataManager,
  map: GameMap
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
    if (playerEntity?.controller instanceof PlayerEntityController) {
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
    } else if (data.button === 'switch-map') {
      map.switchMap()
    }
  }

  world.chatManager.sendPlayerMessage(
    player,
    'Welcome! Use WASD to move around.'
  )
  world.chatManager.sendPlayerMessage(player, 'Press space to jump.')
  world.chatManager.sendPlayerMessage(player, 'Hold shift to sprint.')
  world.chatManager.sendPlayerMessage(
    player,
    'Press left mouse button to shoot.'
  )
  world.chatManager.sendPlayerMessage(
    player,
    'Press Q button to punch.'
  )
  world.chatManager.sendPlayerMessage(player, 'Press E to select your class.')
  world.chatManager.sendPlayerMessage(
    player,
    'Press R to view the leaderboard.'
  )
  world.chatManager.sendPlayerMessage(
    player,
    'Type /set-name to set your name.'
  )
}
export function handlePlayerDeath(
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

export function respawnPlayer(
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
  entity.setOpacity(0.3)
  setTimeout(() => {
    entity.setOpacity(1)
  }, 3000)
  entity.setPosition(spawn)
}
