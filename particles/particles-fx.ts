import { type EmitterOptions } from "./particle-emmitter";

export const ParticleFX = {
    BLOODHIT: {
        count: 6,
        speed: 1.5,
        spawnOptions: {
            radius: 0.2,
            shellOnly: false,
            useSpawnDirectionForVelocity: false,
            velocityRandomness: 0.8 // 30% randomness
        },
        particleOptions: {
            color: { r: 255, g: 0, b: 0 },
            size: 1,
            sizeRandomness: 0.3, // 30% size variation
            lifetime: 0.5,
            modelUri: 'models/particles/blooddrop.gltf',
            gravityScale: 0.6
        }
    } satisfies EmitterOptions,

    BLUE_BLOODHIT: {
        count: 6,
        speed: 1.5,
        spawnOptions: {
            radius: 0.2,
            shellOnly: false,
            useSpawnDirectionForVelocity: false,
            velocityRandomness: 0.8 // 30% randomness
        },
        particleOptions: {
            color: { r: 0, g: 0, b: 255 },
            size: 1,
            sizeRandomness: 0.3, // 30% size variation
            lifetime: 0.5,
            modelUri: 'models/particles/blue-blob.gltf',
            gravityScale: 0.6
        }
    } satisfies EmitterOptions,

    BIG_BLUE: {
        count: 8,
        speed: 1.5,
        spawnOptions: {
            radius: 0.2,
            shellOnly: false,
            useSpawnDirectionForVelocity: false,
            velocityRandomness: 0.8 // 30% randomness
        },
        particleOptions: {
            color: { r: 0, g: 0, b: 255 },
            size: 2.5,
            sizeRandomness: 0.3, // 30% size variation
            lifetime: 0.5,
            modelUri: 'models/particles/blue-blob.gltf',
            gravityScale: 0.6
        }
    } satisfies EmitterOptions,

    EXPLOSION: {
        count: 20,
        speed: 3,
        spawnOptions: {
            radius: 0.05,
            shellOnly: false,
            useSpawnDirectionForVelocity: true,
            velocityRandomness: 0.7 // 30% randomness
        },
        particleOptions: {
            color: { r: 255, g: 0, b: 0 },
            size: 3.5,
            sizeRandomness: 0.2, // 30% size variation
            lifetime: 0.5,
            lifetimeRandomness: 0.3, // 30% lifetime variation
            modelUri: 'models/particles/ember.gltf',
            gravityScale: 0.2
        }
    } satisfies EmitterOptions,
    FOUNTAIN: {
        count: 20,
        speed: 5,
        spawnOptions: {
            radius: 0.2,
            direction: { x: 0, y: 1, z: 0 }, // Shoot upward
            velocityRandomness: 0.2
        },
        particleOptions: {
            color: { r: 0, g: 0.5, b: 1 },
            size: 0.2,
            lifetime: 2,
            modelUri: 'models/particles/water-drop.gltf',
            gravityScale: 0.8
        }
    } satisfies EmitterOptions
} as const;

// Type for accessing particle effects
export type ParticleEffectType = keyof typeof ParticleFX; 