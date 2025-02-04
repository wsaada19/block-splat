// Spawns stamina boosts randomly across the map at a defined interval
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

const boostsSpawned = new Map<string, boolean>();

export function spawnRandomEnergyBoost(
  world: World,
  playerDataManager: PlayerDataManager,
  energySpawnLocations: Vector3Like[]
) {
  const randomLocation =
    energySpawnLocations[
      Math.floor(Math.random() * energySpawnLocations.length)
    ];
  if (boostsSpawned.get(locationString(randomLocation))) {
    return;
  }
  boostsSpawned.set(locationString(randomLocation), true);
  const energyBoost = createEnergyBoost(world, playerDataManager);
  energyBoost.spawn(world, randomLocation);
}

export function createEnergyBoost(
  world: World,
  playerDataManager: PlayerDataManager
) {
  const energyBoost = new Entity({
    name: "Energy Boost",
    blockTextureUri: "blocks/colors/green_concrete.png",
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
        referenceDistance: 5,
      }).play(world);
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        `You earned ${ENERGY_BLOCK_STAMINA_REGEN} stamina from an energy drink!`,
        "FFFF00"
      );
      boostsSpawned.delete(locationString(entity.position));
      entity.despawn();
    } else {
      otherEntity.despawn(); // despawn projectile if it hits the boost
    }
  };
  return energyBoost;
}

function locationString(loc: Vector3Like) {
  return `${loc.x}-${loc.y}-${loc.z}`;
}
