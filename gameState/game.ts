import {
  World,
  Player,
  PlayerManager,
  type Vector3Like,
  PlayerEntity,
} from "hytopia";
import TeamManager from "./team";
import type { PlayerDataManager } from "./player-data";
import { BLOCK_STATE, clearBlockStates } from "../utilities/block-utils";
import { BOOST_SPAWN_INTERVAL, UI_EVENT_TYPES } from "../utilities/gameConfig";
import { spawnRandomEnergyBoost } from "../utilities/boosts";
import { BACKGROUND_MUSIC, TO_THE_DEATH_MUSIC } from "../index";
export default class Game {
  private world: World;
  private teamManager: TeamManager;
  private playerDataManager: PlayerDataManager;
  private gameTimer: Timer | null = null;
  private uiTimer: Timer | null = null;
  private boostTimer: Timer | null = null;
  private blockStateMap: Map<string, BLOCK_STATE>;
  private timeRemaining: number;
  private timeLimit: number;
  private scores: Map<number, number> = new Map();
  public isGameRunning: boolean = false;
  private energySpawnLocations: Vector3Like[] = [
    { x: 3.5, y: 5.5, z: 0.5 },
    { x: -4.5, y: 5.5, z: 1.5 },
    { x: 10, y: 5.5, z: -10 },
    { x: -10, y: 5.5, z: 10 },
    { x: 0, y: 5.5, z: 10 },
    { x: 0, y: 5.5, z: -10 },
    {x: 34, y: 10, z: -3},
    {x: 6, y: 11, z: 35}
  ];

  constructor(
    world: World,
    teamManager: TeamManager,
    playerDataManager: PlayerDataManager,
    timeLimit: number = 500,
    blockStateMap: Map<string, BLOCK_STATE>
  ) {
    if (this.gameTimer) clearInterval(this.gameTimer);
    if (this.uiTimer) clearInterval(this.uiTimer);

    this.world = world;
    this.teamManager = teamManager;
    this.timeRemaining = timeLimit;
    this.timeLimit = timeLimit;
    this.playerDataManager = playerDataManager;
    this.blockStateMap = blockStateMap;

    // Initialize scores for each team
    for (let i = 1; i <= 2; i++) {
      this.scores.set(i, 0);
    }
  }

  checkPlayerCount() {
    const players = PlayerManager.instance.getConnectedPlayers();
    if (players.length >= 4 && !this.isGameRunning) {
      // start game in 20 seconds
      this.world.chatManager.sendBroadcastMessage(
        "Game starting in 20 seconds!",
        "FFFF00"
      );
      setTimeout(() => {
        this.startGame();
      }, 20 * 1000);
    }
  }
  
  clearMapThenStartGame() {
    if (this.blockStateMap.size > 0) {
      this.world.chatManager.sendBroadcastMessage('Game will begin once the map is reset!')
      clearBlockStates(this.blockStateMap, this.world).then(() => {
        this
        this.startGame();
      });
    } else {
      this.startGame();
    }
  }

  startGame() {
    if (this.isGameRunning) return;

    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    if (this.uiTimer) {
      clearInterval(this.uiTimer);
      this.uiTimer = null;
    }

    BACKGROUND_MUSIC.pause();
    TO_THE_DEATH_MUSIC.play(this.world);

    this.playerDataManager.clearPlayerData();

    this.isGameRunning = true;
    this.timeRemaining = this.timeLimit;

    spawnRandomEnergyBoost(this.world, this.playerDataManager, this.energySpawnLocations);

    this.boostTimer = setInterval(() => {
      spawnRandomEnergyBoost(this.world, this.playerDataManager, this.energySpawnLocations);
    }, BOOST_SPAWN_INTERVAL * 1000);

    // Start main game timer
    this.gameTimer = setInterval(() => {
      this.timeRemaining--;

      if (this.timeRemaining <= 0) {
        this.endGame();
      }
    }, 1000);

    this.uiTimer = setInterval(() => {
      this.playerDataManager.staminaRegen();
      this.updateAllPlayersUI();
    }, 225);

    this.teamManager.spawnPlayers(this.world);
    this.resetScores();
    this.updateAllPlayersUI();
  }

  restartGame() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    if (this.uiTimer) {
      clearInterval(this.uiTimer);
      this.uiTimer = null;
    }
    this.scores = new Map();
    this.clearMapThenStartGame();
  }

  changeScore(teamId: number, score: number) {
    this.scores.set(teamId, (this.scores.get(teamId) ?? 0) + score);
  }

  private resetScores() {
    this.scores.forEach((_, teamId) => {
      this.scores.set(teamId, 0);
    });
  }

  private updateAllPlayersUI() {
    const players = PlayerManager.instance.getConnectedPlayers();
    players.forEach((player) => this.updatePlayerUI(player));
  }

  private updatePlayerUI(player: Player) {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    const scoreStr = Array.from(this.scores.entries())
      .map(
        ([teamId, score]) => `${this.teamManager.getTeamName(teamId)}: ${score}`
      )
      .join(" | ");

    const playerStats = this.playerDataManager.getPlayer(player.id);

    if (!playerStats) return;
    const playerStamina = playerStats.stamina;
    const maxStamina = playerStats.maxStamina;
    const playerPoints = playerStats.playerPoints;
    const playerKills = playerStats.kills;

    const playerTeam = this.teamManager.getTeamName(
      this.teamManager.getPlayerTeam(player.id) ?? 1
    );
    player.ui.sendData({
      type: UI_EVENT_TYPES.GAME_UI,
      time: timeStr,
      scores: scoreStr,
      playerTeam: playerTeam,
      playerStamina: playerStamina,
      maxStamina: maxStamina,
      playerPoints: playerPoints,
      playerKills: playerKills,
      playerName: playerStats.name,
      playerClass: playerStats.class,
    });
  }

  private endGame() {
    if (!this.isGameRunning) return;
    this.isGameRunning = false;

    if (this.gameTimer) clearInterval(this.gameTimer);
    if (this.uiTimer) clearInterval(this.uiTimer);
    if (this.boostTimer) clearInterval(this.boostTimer);

    // Find winning team
    let winningTeam = 1;
    let highestScore = this.scores.get(1) || 0;

    this.scores.forEach((score, teamId) => {
      if (score > highestScore) {
        highestScore = score;
        winningTeam = teamId;
      }
    });

    // Announce winner
    const winningTeamName = this.teamManager.getTeamName(winningTeam);
    this.world.chatManager.sendBroadcastMessage(
      `Game Over! ${winningTeamName} wins with ${highestScore} blocks!`,
      "FFFF00"
    );

    TO_THE_DEATH_MUSIC.pause();
    BACKGROUND_MUSIC.play(this.world);

    for (const player of PlayerManager.instance.getConnectedPlayers()) {
      const playerTeam = this.teamManager.getTeamName(
        this.teamManager.getPlayerTeam(player.id) ?? 1
      );
      if (playerTeam === winningTeamName) {
        player.ui.sendData({
          type: UI_EVENT_TYPES.VICTORY,
        });
      } else {
        player.ui.sendData({
          type: UI_EVENT_TYPES.DEFEAT,
        });
      }
    }

    // clear all entities
    this.world.entityManager.getAllEntities().forEach((entity) => {
      if (!(entity instanceof PlayerEntity)) {
        entity.despawn();
      }
    });

    // send all players to lobby
    this.teamManager.sendAllPlayersToLobby(this.world);
  }
}
