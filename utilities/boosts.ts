// Spawns stamina and strength boosts randomly across the map at a defined interval
import {
  Entity,
  RigidBodyType,
  World,
  Audio,
  type Vector3Like,
} from "hytopia";
import {
  STRENGTH_BOOST_DURATION,
  ENERGY_BOOST_STAMINA_REGEN,
  INVINCIBILITY_BOOST_DURATION,
  BOOST_PROBABILITIES,
} from "./gameConfig";
import CustomPlayerEntity from "../entities/CustomPlayerEntity";

const boostsSpawned = new Map<string, boolean>();

export function spawnRandomEnergyBoost(
  world: World,
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
  for (const boost of BOOST_PROBABILITIES) {
    probability += boost.spawnProbability;
    if (random <= probability) {
      if (boost.type === "energy") {
        randomBoost = createEnergyBoost(world);
        break;
      } else if (boost.type === "strength") {
        randomBoost = createStrengthBoost(world);
        break;
      } else if (boost.type === "invincibility") {
        randomBoost = createInvincibilityBoost(world);
        break;
      }
    }
  }

  boostsSpawned.set(locationString(randomLocation), true);
  if (randomBoost) {
    randomBoost.spawn(world, randomLocation);
  } else {
    console.log("No boost spawned");
  }
}
export function createEnergyBoost(world: World) {
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
    if (started && otherEntity instanceof CustomPlayerEntity) {
      otherEntity.setStamina(ENERGY_BOOST_STAMINA_REGEN);
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
    } else if(!(otherEntity instanceof CustomPlayerEntity) && started) {
      otherEntity.despawn();
    }
  };
  return energyBoost;
}

function locationString(loc: Vector3Like) {
  return `${loc.x}-${loc.y}-${loc.z}`;
}

function createStrengthBoost(world: World) {
  const strengthBoost = new Entity({
    name: "Strength Boost",
    modelUri: "strength_up/strength.gltf",
    modelScale: 0.25,
    modelLoopedAnimations: ["Movement"],
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
    },
  });
  strengthBoost.onEntityCollision = (
    entity,
    otherEntity,
    started,
    colliderHandleA,
    colliderHandleB
  ) => {
    if (started && otherEntity instanceof CustomPlayerEntity) {
      otherEntity.setStrengthBoostActive(true);
      new Audio({
        uri: "audio/sfx/fire/fire-ignite-2.mp3",
        volume: 0.5,
        playbackRate: 1,
        position: otherEntity.position,
        referenceDistance: 4,
      }).play(world);
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        `You're feeling stronger! Increased knockback on enemy hits for ${
          STRENGTH_BOOST_DURATION / 1000
        } seconds!`,
        "FFFF00"
      );
      boostsSpawned.delete(locationString(entity.position));
      entity.despawn();
      setTimeout(() => {
        otherEntity.setStrengthBoostActive(false);
        world.chatManager.sendPlayerMessage(
          otherEntity.player,
          `Your strength boost has expired!`,
          "FFFF00"
        );
      }, STRENGTH_BOOST_DURATION);
    }
  };
  return strengthBoost;
}

function createInvincibilityBoost(world: World) {
  const invincibilityBoost = new Entity({
    name: "Invincibility Boost",
    modelUri: "invincibility/invincibility.gltf",
    modelScale: 0.15,
    modelLoopedAnimations: ["Take 001"],
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
    },
  });
  invincibilityBoost.onEntityCollision = (
    entity,
    otherEntity,
    started,
    colliderHandleA,
    colliderHandleB
  ) => {
    if (started && otherEntity instanceof CustomPlayerEntity) {
      otherEntity.setInvincible();
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        `You're invincible! You won't be impacted by knockback for ${
          INVINCIBILITY_BOOST_DURATION / 1000
        } seconds!`,
        "FFFF00"
      );
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
