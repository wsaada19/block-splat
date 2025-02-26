// Spawns stamina and strength boosts randomly across the map at a defined interval
import {
  Entity,
  PlayerEntity,
  RigidBodyType,
  World,
  Audio,
  type Vector3Like,
} from "hytopia";
import { STRENGTH_BOOST_DURATION, ENERGY_BOOST_STAMINA_REGEN, INVINCIBILITY_BOOST_DURATION, BOOST_PROBABILITIES } from "./gameConfig";
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
  let randomBoost;
  const random = Math.random();
  let probability = 0;
  for( const boost of BOOST_PROBABILITIES) {
    probability += boost.spawnProbability;
    if (random <= probability) {
      if(boost.type === "energy") {
        randomBoost = createEnergyBoost(world, playerDataManager);
        break;
      } else if(boost.type === "strength") {
        randomBoost = createStrengthBoost(world, playerDataManager);
        break;
      } else if(boost.type === "invincibility") {
        randomBoost = createInvincibilityBoost(world, playerDataManager);
        break;
      }
    }
  }

  boostsSpawned.set(locationString(randomLocation), true);
  if(randomBoost) {
    randomBoost.spawn(world, randomLocation);
  } else {
    console.log("No boost spawned");
  }
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
    if (started && entity.isSpawned && otherEntity instanceof PlayerEntity) {
      const playerId = otherEntity.player.id;
      playerDataManager.updateStamina(playerId, ENERGY_BOOST_STAMINA_REGEN);
      new Audio({
        uri: "audio/sfx/player/eat.mp3",
        volume: 0.5,
        playbackRate: 1,
        position: otherEntity.position,
        referenceDistance: 4,
      }).play(world);
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        `You earned ${ENERGY_BOOST_STAMINA_REGEN} stamina from an energy drink!`,
        "FFFF00"
      );
      boostsSpawned.delete(locationString(entity.position));
      entity.despawn();
    } else if (started && !(otherEntity instanceof PlayerEntity)) {
      otherEntity.despawn(); // despawn projectile if it hits the boost
    }
  };
  return energyBoost;
}

function locationString(loc: Vector3Like) {
  return `${loc.x}-${loc.y}-${loc.z}`;
}

function createStrengthBoost (world: World, playerDataManager: PlayerDataManager) {
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
    if (started && entity.isSpawned && otherEntity instanceof PlayerEntity) {
      const playerId = otherEntity.player.id;
      new Audio({
        uri: "audio/sfx/fire/fire-ignite-2.mp3",
        volume: 0.5,
        playbackRate: 1,
        position: otherEntity.position,
        referenceDistance: 4,
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

function createInvincibilityBoost (world: World, playerDataManager: PlayerDataManager) {
  const invincibilityBoost = new Entity({
    name: "Invincibility Boost",
    modelUri: "invincibility/invincibility.gltf",
    modelScale: 0.15,
    modelLoopedAnimations: ["Take 001"],
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
    }
  });
  invincibilityBoost.onEntityCollision = (entity, otherEntity, started, colliderHandleA, colliderHandleB) => {
    if (started && entity.isSpawned && otherEntity instanceof PlayerEntity) {
      const playerId = otherEntity.player.id;
      playerDataManager.setPlayerInvincible(playerId, true);
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        `You're invincible! You won't be impacted by knockback for ${INVINCIBILITY_BOOST_DURATION / 1000} seconds!`,
        "FFFF00"
      );
      setTimeout(() => {
        playerDataManager.setPlayerInvincible(playerId, false);
        world.chatManager.sendPlayerMessage(
          otherEntity.player,
          `Your invincibility has expired!`,
          "FFFF00"
        );
      }, INVINCIBILITY_BOOST_DURATION);
      boostsSpawned.delete(locationString(entity.position));
      new Audio({
        uri: "audio/sfx/player/eat.mp3",
        volume: 0.5,
        playbackRate: 1,
        position: otherEntity.position,
        referenceDistance: 4,
      }).play(world);
      entity.despawn();
    }
  };
  return invincibilityBoost;
}
