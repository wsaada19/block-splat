import { Entity, PlayerEntity, RigidBodyType, World, Audio } from "hytopia";
import { ENERGY_BLOCK_STAMINA_REGEN } from "./gameConfig";
import type { PlayerDataManager } from "../gameState/player-data";

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
        `You earned ${ENERGY_BLOCK_STAMINA_REGEN} stamina from eating an energy block!`,
        "FFFF00"
      );
      entity.despawn();
    } else {
      otherEntity.despawn(); // despawn projectile if it hits the boost
    }
  };
  return energyBoost;
};
