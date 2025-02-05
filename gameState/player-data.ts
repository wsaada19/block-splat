import { MAX_STAMINA, STAMINA_REGEN_RATE } from "../utilities/gameConfig";

export enum PlayerClass {
  RUNNER = 'Runner',
  SNIPER = 'Sniper',
  GRENADER = 'Grenader',
  SLINGSHOT = 'Slingshot'
}

export interface PlayerStats {
  class: PlayerClass
  stamina: number
  maxStamina: number
  playerDeaths: number
  playerPoints: number
  lastHitBy: string
  kills: number
  name: string
  respawning: boolean
  strengthBoostActive: boolean
}

export class PlayerDataManager {
  private playerData: Map<string, PlayerStats> = new Map()

  // Add or update a player's data
  public setPlayerClass(playerId: string, playerClass: PlayerClass): void {
    const player = this.playerData.get(playerId)
    this.playerData.set(playerId, {
      class: playerClass,
      stamina: player?.stamina || this.getMaxStaminaForClass(playerClass),
      maxStamina: this.getMaxStaminaForClass(playerClass),
      playerDeaths: player?.playerDeaths || 0,
      playerPoints: player?.playerPoints || 0,
      lastHitBy: player?.lastHitBy || '',
      kills: player?.kills || 0,
      name: player?.name || '',
      respawning: player?.respawning || false,
      strengthBoostActive: player?.strengthBoostActive || false
    })
  }

  public setPlayerRespawning(playerId: string, respawning: boolean): void {
    const player = this.playerData.get(playerId)
    if (player) {
      player.respawning = respawning
    }
  }

  public setStrengthBoostActive(playerId: string, active: boolean): void {
    const player = this.playerData.get(playerId)
    if (player) {
      player.strengthBoostActive = active
    }
  }

  public getStrengthBoostActive(playerId: string): boolean {
    return this.playerData.get(playerId)?.strengthBoostActive || false
  }

  public getPlayerRespawning(playerId: string): boolean {
    return this.playerData.get(playerId)?.respawning || false
  }

  public getPlayerData(): Map<string, PlayerStats> {
    return this.playerData
  }

  public getPlayerName(playerId: string): string {
    return this.playerData.get(playerId)?.name || ''
  }

  // Get a player's current class
  public getPlayerClass(playerId: string): PlayerClass | undefined {
    return this.playerData.get(playerId)?.class
  }

  public setLastHitBy(playerId: string, lastHitBy: string) {
    const player = this.playerData.get(playerId)
    if (player) {
      player.lastHitBy = lastHitBy
    }
  }

  public getPlayer(playerId: string): PlayerStats {
    return this.playerData.get(playerId) || {
      class: PlayerClass.RUNNER,
      stamina: 0,
      maxStamina: MAX_STAMINA[PlayerClass.RUNNER],
      playerDeaths: 0,
      playerPoints: 0,
      lastHitBy: '',
      kills: 0,
      name: '',
      respawning: false,
      strengthBoostActive: false
    };
  }

  public setPlayerName(playerId: string, name: string): void {
    const player = this.playerData.get(playerId)
    if (player) {
      player.name = name
    }
  }

  public updatePlayerDeaths(playerId: string, amount: number): void {
    const player = this.playerData.get(playerId)
    if (player) {
      player.playerDeaths += amount
    }
  }

  public updatePlayerPoints(playerId: string, amount: number): void {
    const player = this.playerData.get(playerId)
    if (player) {
      player.playerPoints += amount
    }
  }

  // Get a player's current stamina
  public getPlayerStamina(playerId: string): number {
    return this.playerData.get(playerId)?.stamina ?? 0
  }

  // Get a player's max stamina
  public getMaxStamina(playerId: string): number {
    return this.playerData.get(playerId)?.maxStamina ?? MAX_STAMINA[PlayerClass.RUNNER]
  }

  // Update a player's stamina
  public updateStamina(playerId: string, amount: number): void {
    const player = this.playerData.get(playerId)
    if (player) {
      player.stamina = Math.max(
        0,
        Math.min(player.maxStamina, player.stamina + amount)
      )
    }
  }

  // Remove a player's data when they leave
  public removePlayer(playerId: string): void {
    this.playerData.delete(playerId)
  }

  public clearPlayerData() {
    // keep player name and class
    this.playerData.forEach((player, id) => {
      this.playerData.set(id, {
        ...player,
        stamina: player.maxStamina,
        kills: 0,
        playerDeaths: 0,
        playerPoints: 0,
        respawning: false
      })
    })
  }

  public staminaRegen() {
    for (const player of this.playerData.values()) {
      if (player.stamina + STAMINA_REGEN_RATE > player.maxStamina) {
        player.stamina = player.maxStamina
      } else {
        player.stamina += STAMINA_REGEN_RATE
      }
    }
  }

  public setToMaxStamina(playerId: string) {
    const player = this.playerData.get(playerId)
    if (player) {
      player.stamina = player.maxStamina
    }
  }

  // Get max stamina based on class
  private getMaxStaminaForClass(playerClass: PlayerClass): number {
    switch (playerClass) {
      case PlayerClass.RUNNER:
        return MAX_STAMINA[PlayerClass.RUNNER]
      case PlayerClass.SNIPER:
        return MAX_STAMINA[PlayerClass.SNIPER]
      case PlayerClass.GRENADER:
        return MAX_STAMINA[PlayerClass.GRENADER]
      case PlayerClass.SLINGSHOT:
        return MAX_STAMINA[PlayerClass.SLINGSHOT]
      default:
        return MAX_STAMINA[PlayerClass.RUNNER]
    }
  }

  public getPlayerPoints(playerId: string): number {
    return this.playerData.get(playerId)?.playerPoints ?? 0
  }
}
