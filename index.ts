import { startServer, Audio, Entity, BlockType, SceneUI } from "hytopia";
import {
  BLOCK_STATE,
  BLUE_BLOCK_ID,
  coloredBlockData,
  RED_BLOCK_ID,
} from "./utilities/block-utils";

import Game from "./gameState/game";
import worldMap from "./assets/maps/boilerplate.json";
import { PlayerDataManager } from "./gameState/player-data";
import Teams from "./gameState/team";
import { onPlayerJoin } from "./events/player-events";
import { onBlockHit } from "./events/block-events";
import GameMap from "./gameState/map";

const TIME_LIMIT = 60 * 5; // 5 minutes
const blockStateMap = new Map<string, BLOCK_STATE>();

startServer((world) => {
  const playerData = new PlayerDataManager();

  const teamManager = new Teams(
    ["Blue Bandits", "Red Raiders"],
    [
      { x: -32, y: 25, z: -3 },
      { x: 32, y: 20, z: 5 },
    ],
    playerData
  );
  const game = new Game(
    world,
    teamManager,
    playerData,
    TIME_LIMIT,
    blockStateMap
  );

  const map = new GameMap(world);

  world.onPlayerJoin = (player) =>
    onPlayerJoin(player, world, teamManager, game, playerData, map);

  world.onPlayerLeave = (player) => {
    teamManager.removePlayer(player.id);
    playerData.removePlayer(player.id);
    world.entityManager
      .getPlayerEntitiesByPlayer(player)
      .forEach((entity) => entity.despawn());
  };

  coloredBlockData.forEach((blockData) => {
    const block = world.blockTypeRegistry.registerGenericBlockType({
      id: blockData.id,
      textureUri: blockData.textureUri,
      name: blockData.name,
    });

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
        playerData,
        teamManager,
        blockStateMap
      );
  });

  world.loadMap(worldMap);

  // const boundaries = [50, -50]

  // boundaries.forEach((x) => {
  //   for(let y = -10; y < 50; y++) {
  //     for(let z = -50; z < 50; z++) {
  //       world.chunkLattice.setBlock({x, y, z}, 22);
  //     }
  //   }
  // })

  // boundaries.forEach((z) => {
  //   for(let y = -10; y < 50; y++) {
  //     for(let x = -50; x < 50; x++) {
  //       world.chunkLattice.setBlock({x, y, z}, 23);
  //     }
  //   }
  // })

  // for(let x = -50; x < 50; x++) {
  //   for(let z = -50; z < 50; z++) {
  //     world.chunkLattice.setBlock({x, y: 50, z}, 24);
  //   }
  // }

  // spawn a 20 by 20 by 20 glass box between y 60 and y 70
  for (let x = -10; x < 10; x++) {
    for (let z = -10; z < 10; z++) {
      world.chunkLattice.setBlock({ x, y: 60, z }, 21);
    }
  }

  // add walls around the glass box
  for (let y = 60; y < 70; y++) {
    for (let z = -10; z < 10; z++) {
      world.chunkLattice.setBlock({ x: -10, y, z }, 21);
      world.chunkLattice.setBlock({ x: 10, y, z }, 21);
    }
    for (let x = -10; x < 10; x++) {
      world.chunkLattice.setBlock({ x, y, z: -10 }, 21);
      world.chunkLattice.setBlock({ x, y, z: 10 }, 21);
    }
  }

  const instructionsSceneUI = new SceneUI({
    templateId: "game-instructions",
    position: { x: 0, y: 65, z: 10 },
    state: { visible: true },
  });

  instructionsSceneUI.load(world);

  world.chatManager.registerCommand("/start-game", () => {
    if (game.isGameRunning) {
      world.chatManager.sendBroadcastMessage("Game already running!");
      return;
    }
    world.chatManager.sendBroadcastMessage("Starting game...");
    game.startGame();
  });

  world.chatManager.registerCommand("/set-name", (player, args) => {
    playerData.setPlayerName(player.id, args[0]);
    world.chatManager.sendPlayerMessage(player, `Name set to ${args[0]}`);
    player.ui.sendData({ type: "set-name", name: args[0] });
  });

  world.chatManager.registerCommand("/change-team", (player, args) => {
    teamManager.switchTeam(player.id);
    world.chatManager.sendPlayerMessage(player, "Team changed!");
  });

  // Play some peaceful ambient music
  new Audio({
    uri: "audio/music/hytopia-main.mp3",
    loop: true,
    volume: 0.1,
  }).play(world);
});
