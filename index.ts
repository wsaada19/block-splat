import { startServer, Audio, Entity, BlockType, SceneUI, World } from "hytopia";
import { BLOCK_STATE, coloredBlockData } from "./utilities/block-utils";

import Game from "./gameState/game";
import worldMap from "./assets/maps/boilerplate.json";
import { PlayerDataManager } from "./gameState/player-data";
import Teams from "./gameState/team";
import { onPlayerJoin, onPlayerLeave } from "./events/player-events";
import { onBlockHit } from "./events/block-events";
import GameMap from "./gameState/map";
import { GAME_TIME } from "./utilities/gameConfig";

export const TO_THE_DEATH_MUSIC = new Audio({
  uri: "audio/music/to-the-death.mp3",
  loop: true,
  volume: 0.08,
});

export const BACKGROUND_MUSIC = new Audio({
  uri: "audio/music/hytopia-main.mp3",
  loop: true,
  volume: 0.08,
});
const GLASS_BLOCK_ID = 21;

const blockStateMap = new Map<string, BLOCK_STATE>();

startServer((world) => {
  const playerData = new PlayerDataManager();

  const teamManager = new Teams(
    ["Blue Bandits", "Red Raiders"],
    [
      { x: -31.5, y: 25, z: -4 },
      { x: 31.5, y: 20, z: 5 },
    ],
    playerData
  );
  const game = new Game(
    world,
    teamManager,
    playerData,
    GAME_TIME,
    blockStateMap
  );

  const map = new GameMap(world);

  world.onPlayerJoin = (player) =>
    onPlayerJoin(player, world, teamManager, game, playerData, map);

  world.onPlayerLeave = (player) =>
    onPlayerLeave(player, world, teamManager, playerData);

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

  loadGameLobby(world)

  const instructionsSceneUI = new SceneUI({
    templateId: "game-instructions",
    position: { x: 0, y: 65, z: 10 },
    state: { visible: true },
  });

  instructionsSceneUI.load(world);

  world.chatManager.registerCommand("/start", () => {
    if (game.isGameRunning) {
      world.chatManager.sendBroadcastMessage("Game already running!");
      return;
    }
    world.chatManager.sendBroadcastMessage("Starting game...");
    game.clearMapThenStartGame();
  });

  world.chatManager.registerCommand("/set-name", (player, [name]) => {
    if(!name && name.length < 1) return;
    playerData.setPlayerName(player.id, name);
    world.chatManager.sendPlayerMessage(player, `Name set to ${name}`);
    player.ui.sendData({ type: "set-name", name });
  });

  world.chatManager.registerCommand("/change-team", (player, args) => {
    teamManager.switchTeam(player.id);
    world.chatManager.sendPlayerMessage(player, "Team changed!");
  });

  BACKGROUND_MUSIC.play(world);
});

const loadGameLobby = (world: World) => {
  for (let x = -10; x < 10; x++) {
    for (let z = -10; z < 10; z++) {
      world.chunkLattice.setBlock({ x, y: 60, z }, GLASS_BLOCK_ID);
    }
  }

  // add walls around the glass box
  for (let y = 60; y < 70; y++) {
    for (let z = -10; z < 10; z++) {
      world.chunkLattice.setBlock({ x: -10, y, z }, GLASS_BLOCK_ID);
      world.chunkLattice.setBlock({ x: 10, y, z }, GLASS_BLOCK_ID);
    }
    for (let x = -10; x < 10; x++) {
      world.chunkLattice.setBlock({ x, y, z: -10 }, GLASS_BLOCK_ID);
      world.chunkLattice.setBlock({ x, y, z: 10 }, GLASS_BLOCK_ID);
    }
  }
}

// unused method for adding colored walls around the arena
const loadWalls = (world: World) => {
  const boundaries = [50, -50]
  boundaries.forEach((x) => {
    for(let y = -10; y < 50; y++) {
      for(let z = -50; z < 50; z++) {
        world.chunkLattice.setBlock({x, y, z}, 22);
      }
    }
  })
  boundaries.forEach((z) => {
    for(let y = -10; y < 50; y++) {
      for(let x = -50; x < 50; x++) {
        world.chunkLattice.setBlock({x, y, z}, 23);
      }
    }
  })
  for(let x = -50; x < 50; x++) {
    for(let z = -50; z < 50; z++) {
      world.chunkLattice.setBlock({x, y: 50, z}, 24);
    }
  }
};
