import { Entity, Player, PlayerEntity } from "hytopia";
import { TEAM_COLORS } from "../gameState/team";
import {
  MAX_STAMINA,
  PUNCH_FORCE,
  PUNCH_VERTICAL_FORCE,
  RESPAWN_INVINCIBILITY_TIME,
  STRENGTH_BOOST_MULTIPLIER,
} from "../utilities/gameConfig";
import { PlayerClass } from "./player-types";
import CustomPlayerController from "../controllers/CustomPlayerController";
import { globalState } from "../gameState/global-state";
import type TeamManager from "../gameState/team";

class CustomPlayerEntity extends PlayerEntity {
  private playerClass: PlayerClass = PlayerClass.RUNNER;
  private kills: number = 0;
  private playerDeaths: number = 0;
  private playerPoints: number = 0;
  private lastHitBy: string = "";
  private stamina: number = 0;
  private maxStamina: number = 0;
  private invincible: boolean = false;
  private strengthBoostActive: boolean = false;
  private team: number = 0;
  private isTackling: boolean = false;

  constructor(player: Player, team: number, teamManager: TeamManager) {
    super({
      player,
      name: "Player",
      modelUri:
        team === TEAM_COLORS.BLUE
          ? "models/players/player-blue.gltf"
          : "models/players/player-red.gltf",
      modelLoopedAnimations: ["idle"],
      modelScale: 0.5,
    });
    this.team = team;
    this.stamina = 0;

    // Set the custom controller
    const world = globalState.world;
    this.setController(new CustomPlayerController({
      teamManager: teamManager,
      world: world,
    }));

    this.onEntityCollision = (
      entity: Entity,
      otherEntity: Entity,
      started: boolean
    ) => {
      if (
        otherEntity instanceof CustomPlayerEntity &&
        entity instanceof CustomPlayerEntity && 
        this.isPlayerTackling() &&
        started
      ) {
        const direction = this.controller instanceof CustomPlayerController 
          ? this.controller.getDirectionFromRotation(entity.rotation)
          : { x: 0, y: 0, z: 0 };
        const verticalForce = Math.max(direction.y, 0.7) * PUNCH_VERTICAL_FORCE;
        let multiplier = 1;
        if (entity.isStrengthBoostActive()) {
          multiplier = STRENGTH_BOOST_MULTIPLIER;
        }
        otherEntity.applyImpulse({
          x: direction.x * PUNCH_FORCE * multiplier,
          y: verticalForce,
          z: direction.z * PUNCH_FORCE * multiplier,
        });
        otherEntity.setLastHitBy(entity.player.username);
      }
    };
  }

  public getKills(): number {
    return this.kills;
  }

  public getTeam(): number {
    return this.team;
  }

  public getPlayerClass(): PlayerClass {
    return this.playerClass;
  }

  public getDisplayName(): string {
    return this.player.username;
  }

  public setPlayerClass(playerClass: PlayerClass): void {
    this.maxStamina = MAX_STAMINA[playerClass];
    this.playerClass = playerClass;
  }

  public getPlayerDeaths(): number {
    return this.playerDeaths;
  }

  public getPlayerPoints(): number {
    return this.playerPoints;
  }

  public getLastHitBy(): string {
    return this.lastHitBy;
  }

  public getStamina(): number {
    return this.stamina;
  }

  public getMaxStamina(): number {
    return this.maxStamina;
  }

  public isInvincible(): boolean {
    return this.invincible;
  }

  public isStrengthBoostActive(): boolean {
    return this.strengthBoostActive;
  }

  public setKills(kills: number): void {
    this.kills = kills;
  }

  public incrementPlayerDeaths(): void {
    this.playerDeaths++;
  }

  public incrementKills(): void {
    this.kills++;
  }

  public incrementPlayerPoints(points: number): void {
    this.playerPoints += points;
  }

  public resetData(): void {
    this.stamina = this.maxStamina;
    this.playerPoints = 0;
    this.kills = 0;
    this.playerDeaths = 0;
  }

  public setLastHitBy(lastHitBy: string): void {
    this.lastHitBy = lastHitBy;
  }

  public setStamina(stamina: number): void {
    if (stamina + this.stamina > this.maxStamina) {
      this.stamina = this.maxStamina;
    } else {
      this.stamina += stamina;
    }
  }

  public setInvincible(): void {
    this.invincible = true;
    setTimeout(() => {
      this.invincible = false;
      this.setOpacity(1);
    }, RESPAWN_INVINCIBILITY_TIME);
    this.setOpacity(0.5);
  }

  public setStrengthBoostActive(strengthBoostActive: boolean): void {
    this.strengthBoostActive = strengthBoostActive;
  }

  public tackle() {
    this.isTackling = true;
    setTimeout(() => {
      this.isTackling = false;
    }, 1500);
  }

  public isPlayerTackling(): boolean {
    return this.isTackling;
  }
}

export default CustomPlayerEntity;
