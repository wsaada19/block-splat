import {
  startServer,
  Audio,
  Entity,
  BlockType,
} from 'hytopia'
import {
  BLOCK_STATE,
  coloredBlockData,
} from './utilities/block-utils'

import Game from './gameState/game'
import worldMap from './assets/maps/boilerplate.json'
import { PlayerDataManager } from './gameState/player-data'
import TeamManager from './gameState/team'
import { onPlayerJoin } from './events/player-events'
import { onBlockHit } from './events/block-events'
import GameMap from './gameState/map'


const TIME_LIMIT = 60 * 5 // 5 minutes
const blockStateMap = new Map<string, BLOCK_STATE>()

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

  const map = new GameMap(world)

  world.onPlayerJoin = (player) =>
    onPlayerJoin(player, world, teamManager, game, playerDataManager, map)

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
        teamManager,
        blockStateMap
      )
  })

  world.loadMap(worldMap)

  world.chatManager.registerCommand('/start-game', () => {
    if (game.isGameRunning) {
      world.chatManager.sendBroadcastMessage('Game already running!')
      return
    }
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

