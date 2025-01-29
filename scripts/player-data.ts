export enum PlayerClass {
  RUNNER = 'runner',
  SNIPER = 'sniper',
  GRENADER = 'grenader'
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
      name: player?.name || ''
    })
  }

  public getPlayerData(): Map<string, PlayerStats> {
    return this.playerData
  }

  // Get a player's current class
  public getPlayerClass(playerId: string): PlayerClass | undefined {
    return this.playerData.get(playerId)?.class
  }

  public addKill(playerId: string) {
    const player = this.playerData.get(playerId)
    if (player) {
      player.kills++
    }
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
      maxStamina: 100,
      playerDeaths: 0,
      playerPoints: 0,
      lastHitBy: '',
      kills: 0,
      name: ''
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
    return this.playerData.get(playerId)?.maxStamina ?? 100
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

  public staminaRegen() {
    for (const player of this.playerData.values()) {
      player.stamina += 5
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
        return 120
      case PlayerClass.SNIPER:
        return 400
      case PlayerClass.GRENADER:
        return 600
      default:
        return 100
    }
  }

  public getPlayerPoints(playerId: string): number {
    return this.playerData.get(playerId)?.playerPoints ?? 0
  }
}
