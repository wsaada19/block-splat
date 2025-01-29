import { World, Player, PlayerManager } from 'hytopia'
import TeamManager from './team'
import type { PlayerDataManager } from './player-data'
import { BLOCK_STATE, clearBlockStates } from './block-utils'

export type GameEventHandler = () => void

export default class Game {
  private world: World
  private teamManager: TeamManager
  private playerDataManager: PlayerDataManager
  private gameTimer: Timer | null = null
  private uiTimer: Timer | null = null
  private onEndHandler: GameEventHandler | null = null
  private blockStateMap: Map<string, BLOCK_STATE>
  private timeRemaining: number
  private timeLimit: number
  private scores: Map<number, number> = new Map()
  public isGameRunning: boolean = false

  constructor(
    world: World,
    teamManager: TeamManager,
    playerDataManager: PlayerDataManager,
    timeLimit: number = 500,
    blockStateMap: Map<string, BLOCK_STATE>
  ) {
    this.world = world
    this.teamManager = teamManager
    this.timeRemaining = timeLimit
    this.timeLimit = timeLimit
    this.playerDataManager = playerDataManager
    this.blockStateMap = blockStateMap

    // Initialize scores for each team
    for (let i = 1; i <= 2; i++) {
      this.scores.set(i, 0)
    }
  }

  // Add event handler setter
  setOnEnd(handler: GameEventHandler) {
    this.onEndHandler = handler
  }

  startGame() {
    if (this.isGameRunning) return
    this.isGameRunning = true

    clearBlockStates(this.blockStateMap, this.world)

    // Start main game timer
    this.gameTimer = setInterval(() => {
      this.timeRemaining--

      if (this.timeRemaining <= 0) {
        this.endGame()
      }
    }, 1000)

    this.uiTimer = setInterval(() => {
      this.updateAllPlayersUI()
      this.playerDataManager.staminaRegen()
    }, 250)

    for (const player of PlayerManager.instance.getConnectedPlayers()) {
      this.playerDataManager.setToMaxStamina(player.id)
    }
    this.teamManager.spawnPlayers(this.world)

    this.resetScores()
    this.updateAllPlayersUI()
  }

  restartGame() {
    this.timeRemaining = this.timeLimit
    this.scores.forEach((_, teamId) => {
      this.scores.set(teamId, 0)
    })

    // TODO randomize teams
    this.startGame()
    this.updateAllPlayersUI()
  }

  changeScore(teamId: number, score: number) {
    this.scores.set(teamId, (this.scores.get(teamId) ?? 0) + score)
  }

  private resetScores() {
    // Reset scores
    this.scores.forEach((_, teamId) => {
      this.scores.set(teamId, 0)
    })
  }

  private updateAllPlayersUI() {
    const players = PlayerManager.instance.getConnectedPlayers()
    players.forEach((player) => this.updatePlayerUI(player))
  }

  private updatePlayerUI(player: Player) {
    const minutes = Math.floor(this.timeRemaining / 60)
    const seconds = this.timeRemaining % 60
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

    const scoreStr = Array.from(this.scores.entries())
      .map(
        ([teamId, score]) => `${this.teamManager.getTeamName(teamId)}: ${score}`
      )
      .join(' | ')

    const playerStats = this.playerDataManager.getPlayer(player.id)

    if (!playerStats) return
    const playerStamina = playerStats.stamina
    const maxStamina = playerStats.maxStamina
    const playerPoints = playerStats.playerPoints
    const playerKills = playerStats.kills

    const playerTeam = this.teamManager.getTeamName(
      this.teamManager.getPlayerTeam(player.id) ?? 1
    )
    player.ui.sendData({
      type: 'game-ui',
      time: timeStr,
      scores: scoreStr,
      playerTeam: playerTeam,
      playerStamina: playerStamina,
      maxStamina: maxStamina,
      playerPoints: playerPoints,
      playerKills: playerKills
    })
  }

  private endGame() {
    if (!this.isGameRunning) return
    this.isGameRunning = false

    if (this.gameTimer) clearInterval(this.gameTimer)

    // Find winning team
    let winningTeam = 1
    let highestScore = this.scores.get(1) || 0

    this.scores.forEach((score, teamId) => {
      if (score > highestScore) {
        highestScore = score
        winningTeam = teamId
      }
    })

    // Announce winner
    const winningTeamName = this.teamManager.getTeamName(winningTeam)
    this.world.chatManager.sendBroadcastMessage(
      `Game Over! ${winningTeamName} wins with ${highestScore} blocks!`,
      'FFFF00'
    )

    // Call end handler if set
    if (this.onEndHandler) {
      this.onEndHandler()
    }
  }
}
