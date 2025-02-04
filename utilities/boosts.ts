import {
  Entity,
  PlayerEntity,
  RigidBodyType,
  World,
  Audio,
  type Vector3Like,
} from "hytopia";
import { ENERGY_BLOCK_STAMINA_REGEN } from "./gameConfig";
import type { PlayerDataManager } from "../gameState/player-data";

// TODO dont despawn, but dont spawn another one if it is already active at a given location
const boostSpawnedAtLocation = new Map<string, boolean>();

export const spawnRandomEnergyBoost = (
  world: World,
  playerDataManager: PlayerDataManager,
  energySpawnLocations: Vector3Like[]
) => {
  const randomLocation =
    energySpawnLocations[
      Math.floor(Math.random() * energySpawnLocations.length)
    ];
  if (
    boostSpawnedAtLocation.get(
      `${randomLocation.x}-${randomLocation.y}-${randomLocation.z}`
    )
  ) {
    return;
  }
  boostSpawnedAtLocation.set(
    `${randomLocation.x}-${randomLocation.y}-${randomLocation.z}`,
    true
  );
  const energyBoost = createEnergyBoost(world, playerDataManager);
  energyBoost.spawn(world, randomLocation);
};

export const createEnergyBoost = (
  world: World,
  playerDataManager: PlayerDataManager
) => {
  const energyBoost = new Entity({
    name: "Energy Boost",
    blockTextureUri: "blocks/diamond-block.png",
    blockHalfExtents: { x: 0.2, y: 0.3, z: 0.2 },
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
    },
    tag: "energy-boost",
  });
  energyBoost.onEntityCollision = (
    entity,
    otherEntity,
    started,
    colliderHandleA,
    colliderHandleB
  ) => {
    if (started && otherEntity instanceof PlayerEntity) {
      const playerId = otherEntity.player.id;
      playerDataManager.updateStamina(playerId, ENERGY_BLOCK_STAMINA_REGEN);
      new Audio({
        uri: "audio/sfx/player/eat.mp3",
        volume: 0.8,
        playbackRate: 1,
        position: otherEntity.position,
        referenceDistance: 20,
      }).play(world);
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        `You earned ${ENERGY_BLOCK_STAMINA_REGEN} stamina from an energy drink!`,
        "FFFF00"
      );
      entity.despawn();
      boostSpawnedAtLocation.delete(
        `${entity.position.x}-${entity.position.y}-${entity.position.z}`
      );
    } else {
      otherEntity.despawn(); // despawn projectile if it hits the boost
    }
  };
  return energyBoost;
};
