import { PlayerEntity, type Vector3Like, type World, Audio } from "hytopia";

import type { Entity } from "hytopia";
import type { BlockType } from "hytopia";
import type Game from "../gameState/game";
import { PlayerClass, type PlayerDataManager } from "../gameState/player-data";
import type TeamManager from "../gameState/team";
import {
  BLANK_BLOCK_ID,
  BLOCK_STATE,
  blockIds,
  BLUE_BLOCK_ID,
  getBlockIdFromState,
  getStateFromTag,
  RED_BLOCK_ID,
  setBlockState,
} from "../utilities/block-utils";
import { PROJECTILES } from "../utilities/gameConfig";
import { TEAM_COLORS } from "../gameState/team";

export function onBlockHit(
  type: BlockType,
  entity: Entity,
  started: boolean,
  colliderHandleA: number,
  colliderHandleB: number,
  world: World,
  game: Game,
  playerDataManager: PlayerDataManager,
  teamManager: TeamManager,
  blockStateMap: Map<string, BLOCK_STATE>
) {
  if (
    entity.name !== "Player" &&
    started &&
    blockIds.includes(type.id) &&
    entity.tag &&
    game.isGameRunning
  ) {
    const contactManifolds = world.simulation.getContactManifolds(
      colliderHandleA,
      colliderHandleB
    );
    const tag = entity.tag;
    const color = teamManager.getPlayerColor(tag);
    let contactPoint: Vector3Like | undefined;

    // Find first contact point
    for (const contactManifold of contactManifolds) {
      if (contactManifold.contactPoints.length > 0) {
        contactPoint = contactManifold.contactPoints[0];
        break;
      }
    }

    let position = entity.position;
    if (contactPoint) {
      // The contact point is in world space, round to nearest block coordinates
      position = {
        x: Math.round(contactPoint.x),
        y: Math.floor(contactPoint.y),
        z: Math.round(contactPoint.z),
      };

      const maxBlocks =
        entity.name === PROJECTILES.ARROW.NAME ||
        entity.name === PROJECTILES.SNIPER.NAME
          ? 2
          : 18;

      let blocksColored = 0;
      const newState = getStateFromTag(color ?? "WHITE");
      const blockId = getBlockIdFromState(newState);

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
        [1, -1, -1],
        [0, -1, 1],
        [1, 1, 1],
        [-1, 1, 1],
        [1, 1, -1],
        [-1, 1, -1],
        [0, -2, 0],
      ];

      for (const [dx, dy, dz] of checkOrder) {
        if (blocksColored >= maxBlocks) break;

        const blockPos = {
          x: position.x + dx,
          y: position.y + dy,
          z: position.z + dz,
        };

        // Skip if not a valid block
        if (!blockIds.includes(world.chunkLattice.getBlockId(blockPos))) {
          continue;
        }

        const blockState = world.chunkLattice.getBlockId(blockPos);
        if (blockState === getBlockIdFromState(newState)) continue;

        // Update scores in one pass
        if (blockState === BLUE_BLOCK_ID) {
          game.changeScore(TEAM_COLORS.BLUE, -1);
        } else if (blockState === RED_BLOCK_ID) {
          game.changeScore(TEAM_COLORS.RED, -1);
        }

        if (newState === BLOCK_STATE.BLUE) {
          game.changeScore(TEAM_COLORS.BLUE, 1);
        } else if (newState === BLOCK_STATE.RED) {
          game.changeScore(TEAM_COLORS.RED, 1);
        }

        world.chunkLattice.setBlock(blockPos, blockId);
        setBlockState(blockStateMap, blockPos, newState);

        blocksColored++;
      }

      playerDataManager.updatePlayerPoints(tag, blocksColored);

      new Audio({
        uri: "audio/sfx/liquid/splash-01.mp3",
        playbackRate: 2,
        volume: 0.5,
        referenceDistance: 10,
        position: position,
        loop: false,
      }).play(world);

      entity.despawn();
    }
  }

  if (entity instanceof PlayerEntity && started && blockIds.includes(type.id)) {
    const player = entity.player;
    const playerClass = playerDataManager.getPlayerClass(player.id);
    if (playerClass === PlayerClass.RUNNER) {
      const teamColor = teamManager.getPlayerColor(player.id);
      const position = entity.position;
      const blockPos = {
        x: Math.floor(position.x),
        y: Math.floor(position.y - 1), // Block below player
        z: Math.floor(position.z),
      };

      const blockState = world.chunkLattice.getBlockId(blockPos);
      const newState = getStateFromTag(teamColor);
      const blockId =
        newState === BLOCK_STATE.BLUE ? BLUE_BLOCK_ID : RED_BLOCK_ID;
      if (blockState !== blockId) {
        // dont do anything if block is air
        if (blockState === 0) {
          return;
        }
        // Remove point from old team if block was colored
        if (blockState === BLOCK_STATE.BLUE) {
          game.changeScore(TEAM_COLORS.BLUE, -1);
        } else if (blockState === BLOCK_STATE.RED) {
          game.changeScore(TEAM_COLORS.RED, -1);
        }

        // Add point to new team
        game.changeScore(newState, 1);
        playerDataManager.updatePlayerPoints(player.id, 1);

        // Update block
        world.chunkLattice.setBlock(blockPos, blockId);
        setBlockState(blockStateMap, blockPos, newState);
      }
    }
  }
}
