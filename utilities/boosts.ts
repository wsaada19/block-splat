// Spawns stamina boosts randomly across the map at a defined interval
import {
  Entity,
  PlayerEntity,
  RigidBodyType,
  World,
  Audio,
  type Vector3Like,
} from "hytopia";
import { STRENGTH_BOOST_DURATION, ENERGY_BOOST_STAMINA_REGEN } from "./gameConfig";
import type { PlayerDataManager } from "../gameState/player-data";

const boostsSpawned = new Map<string, boolean>();

const BOOSTS = [
  {
    type: "energy",
    spawnProbability: 0.75,
  },
  {
    type: "strength",
    spawnProbability: 0.25,
  },
];

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
  let boost;
  const random = Math.random();
  if (random < BOOSTS[0].spawnProbability) {
    boost = createEnergyBoost(world, playerDataManager);
  } else {
    boost = createStrengthBoost(world, playerDataManager);
  }

  boostsSpawned.set(locationString(randomLocation), true);
  boost.spawn(world, randomLocation);
}

export function createEnergyBoost(
  world: World,
  playerDataManager: PlayerDataManager
) {
  const energyBoost = new Entity({
    name: "Energy Boost",
    modelUri: "energy_drink/energy_drink.gltf",
    modelScale: 0.04,
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
      playerDataManager.updateStamina(playerId, ENERGY_BOOST_STAMINA_REGEN);
      new Audio({
        uri: "audio/sfx/player/eat.mp3",
        volume: 0.8,
        playbackRate: 1,
        position: otherEntity.position,
        referenceDistance: 5,
      }).play(world);
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        `You earned ${ENERGY_BOOST_STAMINA_REGEN} stamina from an energy drink!`,
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

const createStrengthBoost = (world: World, playerDataManager: PlayerDataManager) => {
  const strengthBoost = new Entity({
    name: "Strength Boost",
    modelUri: "strength_up/strength.gltf",
    modelScale: 0.25,
    modelLoopedAnimations: ["Movement"],
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
    }
  });
  strengthBoost.onEntityCollision = (entity, otherEntity, started, colliderHandleA, colliderHandleB) => {
    if (started && otherEntity instanceof PlayerEntity) {
      const playerId = otherEntity.player.id;
      new Audio({
        uri: "audio/sfx/fire/fire-ignite-2.mp3",
        volume: 0.8,
        playbackRate: 1,
        position: otherEntity.position,
        referenceDistance: 5,
      }).play(world);
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        `You're feeling stronger! Increased knockback on enemy hits for ${STRENGTH_BOOST_DURATION / 1000} seconds!`,
        "FFFF00"
      );  
      boostsSpawned.delete(locationString(entity.position));
      entity.despawn();
      playerDataManager.setStrengthBoostActive(playerId, true);
      setTimeout(() => {
        playerDataManager.setStrengthBoostActive(playerId, false);
        world.chatManager.sendPlayerMessage(
          otherEntity.player,
          `Your strength boost has expired!`,
          "FFFF00"
        );
      }, STRENGTH_BOOST_DURATION);
    }
  };
  return strengthBoost;
};
