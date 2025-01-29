import { PlayerEntity, type Entity, Audio } from "hytopia";
import type { PlayerDataManager } from "./player-data";

export type ProjectileType = 'BLOB' | 'ARROW';

export const PROJECTILES = {
    BLOB: {
        NAME: 'Blob',
        MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
        MODEL_SCALE: 1.5,
        SPEED: 30,
        KNOCKBACK: 20,
        ENERGY: -40,
    },
    ARROW: {
        NAME: 'Arrow',
        MODEL_URI: 'models/projectiles/energy-orb-projectile.gltf',
        MODEL_SCALE: 0.8,
        SPEED: 40,
        KNOCKBACK: 20,
        ENERGY: -15
    }
}

export const knockBackCollisionHandler = (projectile: Entity, otherEntity: Entity, started: boolean, tag: string, playerDataManager: PlayerDataManager) => {
    // IF the projectile hits another player that isn't themselves
    // ALLOW FRIENDLY FIRE because it's funnier
    if (!(otherEntity instanceof PlayerEntity) || otherEntity.player.id === tag) return;
    if (started && projectile.isSpawned) {
        // tag player so we can reward kills
        const playerStats = playerDataManager.getPlayer(otherEntity.player.id);
        if (playerStats) {
            playerStats.lastHitBy = tag;
        }
        // Calculate direction from projectile to player
        const dx = otherEntity.position.x - projectile.position.x;
        const dy = otherEntity.position.y - projectile.position.y;
        const dz = otherEntity.position.z - projectile.position.z;

        // Normalize the direction vector
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        const normalizedDz = dz / length;

        // Calculate impact force based on relative velocity
        const impactForce = projectile.name === PROJECTILES.BLOB.NAME
            ? PROJECTILES.BLOB.KNOCKBACK
            : PROJECTILES.ARROW.KNOCKBACK;
        const verticalForce = Math.max(normalizedDy, 0.7) * impactForce;
        // Add some jitter to the knockback to make it more chaotic
        const jitter = (1 + (Math.random() * 0.2 - 0.1));

        if (projectile.name === PROJECTILES.BLOB.NAME) {
            otherEntity.applyImpulse({
                x: normalizedDx * impactForce * jitter,
                y: verticalForce, // Ensure some upward force
                z: normalizedDz * impactForce * jitter
            });
        } else if (projectile.name === PROJECTILES.ARROW.NAME) {
            otherEntity.applyImpulse({
                x: normalizedDx * impactForce * jitter,
                y: verticalForce, // Increased vertical force
                z: normalizedDz * impactForce * jitter
            });
        }

        // Play hit sound
        if (otherEntity.world) {
            new Audio({
                uri: 'audio/sfx/player/bow-hit.mp3',
                volume: 0.5,
                playbackRate: 1.5,
                position: otherEntity.position,
                referenceDistance: 20
            }).play(otherEntity.world);
        }
    }
}