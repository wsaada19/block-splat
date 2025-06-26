// Spawns stamina and strength boosts randomly across the map at a defined interval
import {
  Entity,
  RigidBodyType,
  World,
  Audio,
  type Vector3Like,
  EntityEvent,
} from "hytopia";
import {
  STRENGTH_BOOST_DURATION,
  ENERGY_BOOST_STAMINA_REGEN,
  INVINCIBILITY_BOOST_DURATION,
  BOOST_PROBABILITIES,
} from "./game-config";
import CustomPlayerEntity from "../entities/CustomPlayerEntity";

const boostsSpawned = new Map<string, boolean>();

const boostOptions = {
  PAINT_BOTTLE: {
    spawnProbability: 0.6,
    modelUri: "models/items/paint-bottle.gltf",
    modelScale: 0.7,
    animation: "",
    sfx: "audio/sfx/player/eat.mp3",
    chatMessage: `Your paint has been replenished!`,
    addBoost: (player: CustomPlayerEntity) => {
      player.setStamina(ENERGY_BOOST_STAMINA_REGEN);
    },
  },
  STRENGTH_BOOST: {
    spawnProbability: 0.1,
    duration: 10000,
    modelUri: "strength_up/strength.gltf",
    modelScale: 0.25,
    animation: "Take 001",
    sfx: "audio/sfx/fire/fire-ignite-2.mp3",
    chatMessage: `POWER BOOST! Increased knockback on enemy hits and paint blocks by running for ${
      STRENGTH_BOOST_DURATION / 1000
    } seconds!`,
    addBoost: (player: CustomPlayerEntity, world: World) => {
      player.setStrengthBoostActive(true);
      setTimeout(() => {
        player.setStrengthBoostActive(false);
        world.chatManager.sendPlayerMessage(
          player.player,
          `Your strength boost has expired!`,
          "FFFF00"
        );
      }, STRENGTH_BOOST_DURATION);
    },
  },
  INVINCIBILITY_BOOST: {
    spawnProbability: 0.3,
    duration: 10000,
    modelUri: "invincibility/invincibility.gltf",
    modelScale: 0.15,
    animation: "Take 001",
    sfx: "audio/sfx/player/eat.mp3",
    chatMessage: `You're invincible! You won't be impacted by knockback for ${
      INVINCIBILITY_BOOST_DURATION / 1000
    } seconds!`,
    addBoost: (player: CustomPlayerEntity, _: World) => {
      player.setInvincible();
    },
  },
};

const energySpawnLocations: Vector3Like[] = [
  { x: 3.5, y: 5.5, z: 0.5 },
  { x: -4.5, y: 5.5, z: 1.5 },
  { x: 10, y: 5.5, z: -10 },
  { x: -10, y: 5.5, z: 10 },
  { x: 0, y: 5.5, z: 10 },
  { x: 0, y: 5.5, z: -10 },
  { x: 34, y: 10, z: -3 },
  { x: 6, y: 11, z: 35 },
  { x: -16.5, y: 7, z: 18 },
];

export function spawnRandomBoost(world: World) {
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
        randomBoost = createBoost(world, "PAINT_BOTTLE");
        break;
      } else if (boost.type === "strength") {
        randomBoost = createBoost(world, "STRENGTH_BOOST");
        break;
      } else if (boost.type === "invincibility") {
        randomBoost = createBoost(world, "INVINCIBILITY_BOOST");
        break;
      }
    }
  }

  boostsSpawned.set(locationString(randomLocation), true);
  if (randomBoost) {
    randomBoost.spawn(world, randomLocation);
  }
}

export function createBoost(
  world: World,
  boostType: keyof typeof boostOptions
) {
  const boost = new Entity({
    name: boostType,
    modelUri: boostOptions[boostType].modelUri,
    modelScale: boostOptions[boostType].modelScale,
    modelLoopedAnimations: [boostOptions[boostType].animation],
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
    },
  });

  boost.on(EntityEvent.ENTITY_COLLISION, ({ entity, otherEntity, started }) => {
    if (
      started &&
      otherEntity instanceof CustomPlayerEntity &&
      entity.isSpawned
    ) {
      new Audio({
        uri: boostOptions[boostType].sfx,
        volume: 0.5,
        playbackRate: 1,
        position: otherEntity.position,
        referenceDistance: 4,
      }).play(world);
      world.chatManager.sendPlayerMessage(
        otherEntity.player,
        boostOptions[boostType].chatMessage,
        "FFFF00"
      );
      boostOptions[boostType].addBoost(otherEntity, world);
      boostsSpawned.delete(locationString(entity.position));
      entity.despawn();
    } else if (!(otherEntity instanceof CustomPlayerEntity) && started) {
      otherEntity.despawn();
    }
  });
  return boost;
}

function locationString(loc: Vector3Like) {
  return `${loc.x}-${loc.y}-${loc.z}`;
}
