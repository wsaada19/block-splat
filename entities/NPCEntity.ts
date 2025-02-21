import { Entity, RigidBodyType, PathfindingEntityController, Vector3, World, type Vector3Like, ColliderShape } from "hytopia";
import { TEAM_COLORS } from "../gameState/team";
import { spawnProjectile } from "../utilities/projectiles";
import { PROJECTILES } from "../utilities/gameConfig";

class NPCEntity extends Entity {
  private lastShootTime: number = 0;
  private shootInterval: number = 2000;
  private moveSpeed: number = 3;
  private team: number;
  private stamina: number = 100;
  private points: number = 0;
  private pathfindController: PathfindingEntityController;
  private targetWaypointIndex: number = 0;
  private isPatrolling: boolean = false;
  private pathMarkers: Entity[] = [];
  private spawnPosition: Vector3Like | null = null;  // Store spawn position
  private waypoints: Vector3Like[] = [];  // Initialize empty, will set after spawn
  private isDescending: boolean = false;  // Track if we're in initial descent
  private groundY: number = 6.5;  // Target ground level
  
  constructor(world: World, team: number) {
    super({
      name: `Bot_${Math.floor(Math.random() * 1000)}`,
      modelUri: team === TEAM_COLORS.BLUE ? 
        "models/players/player-blue.gltf" : 
        "models/players/player-red.gltf",
      modelScale: 0.5,
      modelLoopedAnimations: ["idle", "walk"],
      tag: "npc",
      rigidBodyOptions: {
        enabledRotations: { x: false, y: true, z: false },
        ccdEnabled: true,
        type: RigidBodyType.DYNAMIC,
      },
      controller: new PathfindingEntityController()
    });

    this.team = team;
    this.stamina = 100;
    this.pathfindController = this.controller as PathfindingEntityController;
    
    // Start movement system
    this.onTick = this.tick;
    console.log("NPC Entity created with pathfinding controller:", this.pathfindController);
  }

  private clearPathMarkers() {
    this.pathMarkers.forEach(marker => marker.despawn());
    this.pathMarkers = [];
  }

  private spawnPathMarkers() {
    this.clearPathMarkers();
    
    // Visualize the path with markers
    if (this.pathfindController.waypoints) {
      this.pathfindController.waypoints.forEach(waypoint => {
        const pathMarker = new Entity({
          modelUri: 'models/items/cookie.gltf',
          modelScale: 0.3,
          rigidBodyOptions: {
            type: RigidBodyType.FIXED,
            colliders: [
              {
                shape: ColliderShape.BLOCK,
                halfExtents: { x: 0.2, y: 0.2, z: 0.2 },
                isSensor: true,
              },
            ],
          },
        });
        pathMarker.spawn(this.world!, waypoint);
        this.pathMarkers.push(pathMarker);
      });
    }
  }

  public spawn(world: World, position: Vector3Like): void {
    super.spawn(world, position);
    console.log("NPC spawned at position:", position);
    
    // Store spawn position
    this.spawnPosition = { ...position };
    this.isDescending = true;  // Start in descending mode
    
    // Set ground-level waypoints for after descent
    const groundPos = {
      x: position.x,
      y: this.groundY,
      z: position.z
    };
    
    this.waypoints = [
      { ...groundPos },  // Start point on ground
      { 
        x: groundPos.x + 1,
        y: this.groundY,
        z: groundPos.z
      },
      { 
        x: groundPos.x + 1,
        y: this.groundY,
        z: groundPos.z + 1
      },
      { 
        x: groundPos.x,
        y: this.groundY,
        z: groundPos.z + 1
      },
      { ...groundPos }  // Back to start
    ];
    
    console.log("Ground waypoints set:", this.waypoints);
  }

  private tick = () => {
    if (!this.isSpawned || !this.world) return;

    const now = Date.now();

    // Handle initial descent
    if (this.isDescending) {
      if (this.position.y <= this.groundY + 0.1) {  // Close enough to ground
        console.log("Reached ground level, starting patrol");
        this.isDescending = false;
        this.startMoving();  // Start normal movement
        return;
      }
      
      // Keep falling
      this.setLinearVelocity({ x: 0, y: -2, z: 0 });  // Constant downward velocity
      return;
    }

    // Regenerate stamina
    this.stamina = Math.min(100, this.stamina + 0.5);

    // Shoot periodically
    if (now - this.lastShootTime > this.shootInterval) {
      this.shoot();
      this.lastShootTime = now;
    }
  };

  public startMoving() {
    if (!this.isSpawned || !this.world || !this.spawnPosition) {
      console.log("Cannot start moving - not spawned or no world");
      return;
    }
    
    if (this.isDescending) {
      console.log("Still descending, waiting to reach ground");
      return;
    }
    
    if (this.isPatrolling) {
      console.log("Already moving, skipping");
      return;
    }
    
    console.log("NPC starting ground movement");
    console.log("Current position:", this.position);
    console.log("Attempting to move to waypoint:", this.waypoints[this.targetWaypointIndex]);
    
    this.isPatrolling = true;
    const targetWaypoint = this.waypoints[this.targetWaypointIndex];
    
    // Start walking animation
    this.startModelLoopedAnimations(["walk"]);
    this.stopModelAnimations(["idle"]);
    
    // Use pathfinding for ground movement
    const succeeded = this.pathfindController.pathfind(targetWaypoint, 1, {
      debug: true,
      maxFall: 2,        // Minimal fall needed for ground movement
      maxJump: 1,
      maxOpenSetIterations: 1000,
      verticalPenalty: 2,  // Discourage vertical movement during patrol
      waypointTimeoutMs: 5000,
      pathfindCompleteCallback: () => {
        console.log(`Reached waypoint ${this.targetWaypointIndex}`);
        console.log("Final position:", this.position);
        console.log("Target was:", targetWaypoint);
        
        // Switch to idle animation
        this.startModelLoopedAnimations(["idle"]);
        this.stopModelAnimations(["walk"]);
        
        // Move to next waypoint
        this.targetWaypointIndex = (this.targetWaypointIndex + 1) % this.waypoints.length;
        
        // Reset patrolling flag
        this.isPatrolling = false;
        
        // Clear path markers
        this.clearPathMarkers();
        
        // Schedule next movement after a delay
        setTimeout(() => {
          if (this.isSpawned && this.world) {
            console.log("Starting next waypoint movement");
            this.startMoving();
          }
        }, 2000);
      },
      waypointMoveCompleteCallback: () => {
        console.log("Reached intermediate waypoint");
        console.log("Current position:", this.position);
      },
      waypointMoveSkippedCallback: () => {
        console.log("Skipped waypoint due to timeout");
        console.log("Current position:", this.position);
        console.log("Target was:", targetWaypoint);
        // Try to recover by resetting state
        this.isPatrolling = false;
        this.clearPathMarkers();
        setTimeout(() => this.startMoving(), 2000);
      },
      pathfindAbortCallback: () => {
        console.log("Pathfinding aborted");
        console.log("Current position:", this.position);
        console.log("Target was:", targetWaypoint);
        // Try to recover by resetting state
        this.isPatrolling = false;
        this.clearPathMarkers();
        setTimeout(() => this.startMoving(), 2000);
      },
    });

    if (succeeded) {
      console.log("Path found successfully! Spawning markers...");
      this.spawnPathMarkers();
      
      // Log the waypoints that were found
      if (this.pathfindController.waypoints) {
        console.log("Calculated waypoints:", this.pathfindController.waypoints);
      }
    } else {
      console.log("Failed to find path to waypoint");
      console.log("Start position:", this.position);
      console.log("Target position:", targetWaypoint);
      // Reset state and try again after a delay
      this.isPatrolling = false;
      setTimeout(() => this.startMoving(), 2000);
    }
  }

  private shoot() {
    if (!this.world) return;
    if (this.stamina < PROJECTILES.SLINGSHOT.ENERGY) return;

    // Shoot in random directions but with more purposeful targeting
    const targetOffset = {
      x: (Math.random() - 0.5) * 10, // More focused spread
      y: 0.2 + Math.random() * 0.3,  // Slightly randomized upward angle
      z: (Math.random() - 0.5) * 10
    };

    const shootTarget = {
      x: this.position.x + targetOffset.x,
      y: this.position.y + targetOffset.y,
      z: this.position.z + targetOffset.z
    };

    // Face the shooting target
    const direction = new Vector3(
      targetOffset.x,
      targetOffset.y,
      targetOffset.z
    ).normalize();

    // Update rotation to face target
    const angle = Math.atan2(direction.x, direction.z);
    this.setRotation({ x: 0, y: Math.sin(angle/2), z: 0, w: Math.cos(angle/2) });

    const bulletOrigin = {
      x: this.position.x,
      y: this.position.y + 1.4,
      z: this.position.z
    };

    const projectile = spawnProjectile(
      this.world,
      bulletOrigin,
      direction,
      this.name,
      { 
        getPlayerTeam: () => this.team, 
        getPlayerColor: () => this.team === TEAM_COLORS.BLUE ? TEAM_COLORS.BLUE : TEAM_COLORS.RED 
      } as any,
      "SLINGSHOT"
    );

    this.stamina -= PROJECTILES.SLINGSHOT.ENERGY;
    setTimeout(() => projectile.isSpawned && projectile.despawn(), 2000);
  }

  public getTeam(): number {
    return this.team;
  }

  public resetData(): void {
    this.stamina = 100;
    this.points = 0;
  }

  public incrementPoints(amount: number): void {
    this.points += amount;
  }

  public setPosition(position: Vector3Like): void {
    super.setPosition(position);
    // Reset velocity when repositioning
    this.setLinearVelocity({ x: 0, y: 0, z: 0 });
  }
}

export default NPCEntity; 