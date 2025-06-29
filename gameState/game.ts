import { World, Player, PlayerManager, PlayerEntity } from "hytopia";
import TeamManager from "./team";
import { BLOCK_STATE, clearBlockStates } from "../utilities/block-utils";
import {
  BOOST_SPAWN_INTERVAL,
  STAMINA_REGEN_RATE,
  UI_EVENT_TYPES,
} from "../utilities/game-config";
import { spawnRandomBoost } from "../utilities/boosts";
import { BACKGROUND_MUSIC, TO_THE_DEATH_MUSIC } from "../index";
import { globalState } from "./global-state";
import TimerController from "./timer";

export default class Game {
  private world: World;
  private teamManager: TeamManager;
  private uiTimer: Timer | null = null;
  private boostTimer: Timer | null = null;
  private countdownTimer: TimerController;
  private blockStateMap: Map<string, BLOCK_STATE>;
  private gameTimer: TimerController;
  private scores: Map<number, number> = new Map();
  public isGameRunning: boolean = false;

  constructor(
    world: World,
    teamManager: TeamManager,
    timeLimit: number = 500,
    blockStateMap: Map<string, BLOCK_STATE>
  ) {
    if (this.uiTimer) clearInterval(this.uiTimer);

    this.world = world;
    this.teamManager = teamManager;
    this.blockStateMap = blockStateMap;
    this.gameTimer = new TimerController(timeLimit, () => this.endGame());
    this.countdownTimer = new TimerController(
      35,
      () => this.clearMapThenStartGame(),
      () =>
        this.world.chatManager.sendBroadcastMessage(
          "Game starting in 35 seconds!",
          "FFFF00"
        )
    );

    // Initialize scores for each team
    for (let i = 1; i <= 2; i++) {
      this.scores.set(i, 0);
    }
    this.uiTimer = setInterval(() => {
      globalState
        .getAllPlayers()
        .forEach((player) => player.setStamina(STAMINA_REGEN_RATE));
      this.updateAllPlayersUI();
    }, 225);
  }

  checkPlayerCount() {
    const players = PlayerManager.instance.getConnectedPlayers();
    if (
      players.length >= 2 &&
      !this.isGameRunning &&
      !this.countdownTimer.isRunning()
    ) {
      this.countdownTimer.start();
    }
    this.updateAllPlayersUI();
  }

  clearMapThenStartGame() {
    if (this.countdownTimer.isRunning()) {
      this.countdownTimer.stop();
    }

    if (this.blockStateMap.size > 0) {
      this.world.chatManager.sendBroadcastMessage(
        "Game will begin once the map is reset!"
      );
      clearBlockStates(this.blockStateMap, this.world).then(() => {
        this.startGame();
      });
    } else {
      this.startGame();
    }
  }

  startGame() {
    if (this.isGameRunning) return;

    BACKGROUND_MUSIC.pause();
    TO_THE_DEATH_MUSIC.play(this.world);

    // clear player data
    globalState.getAllPlayers().forEach((player) => {
      player.resetData();
    });

    this.isGameRunning = true;
    this.gameTimer.start();

    spawnRandomBoost(this.world);

    this.boostTimer = setInterval(() => {
      spawnRandomBoost(this.world);
    }, BOOST_SPAWN_INTERVAL * 1000);

    this.teamManager.spawnPlayers(this.world);
    this.resetScores();
    this.updateAllPlayersUI();
  }

  restartGame() {
    this.gameTimer.stop();
    this.scores = new Map();
    this.clearMapThenStartGame();
  }

  changeScore(teamId: number, score: number) {
    // if (
    //   (this.scores.get(teamId) || 0) > 50 &&
    //   (this.scores.get(teamId) || 0) < 100
    // ) {
    //   this.world.chatManager.sendBroadcastMessage(
    //     `There are ${this.world.entityManager.getAllEntities().length} entities in the game!`,
    //     "FFFF00"
    //   );
    // }
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

  // New method to update player teams data when players join/leave
  public updatePlayerTeamsData() {
    const allPlayers = PlayerManager.instance.getConnectedPlayers();
    const playerTeams = allPlayers.map((p) => ({
      name: p.username,
      team: this.teamManager.getTeamName(
        this.teamManager.getPlayerTeam(p.username) ?? 1
      ),
    }));

    // Send player teams data to all players
    allPlayers.forEach((player) => {
      player.ui.sendData({
        type: UI_EVENT_TYPES.PLAYER_TEAMS,
        playerTeams: playerTeams,
        playerName: player.username,
      });
    });
  }

  private updatePlayerUI(player: Player) {
    let timeStr: string;

    if (this.isGameRunning) {
      const minutes = Math.floor(this.gameTimer.getTime() / 60);
      const seconds = this.gameTimer.getTime() % 60;
      timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    } else if (this.countdownTimer.isRunning()) {
      timeStr = `${this.countdownTimer.getTime()}s`;
    } else {
      const players = PlayerManager.instance.getConnectedPlayers();
      timeStr = `Waiting... (${players.length}/2)`;
    }

    const scoreStr = Array.from(this.scores.entries())
      .map(
        ([teamId, score]) => `${this.teamManager.getTeamName(teamId)}: ${score}`
      )
      .join(" | ");

    const playerStats = globalState.getPlayerEntity(player.username);
    if (!playerStats) return;

    const playerStamina = playerStats.getStamina();
    const maxStamina = playerStats.getMaxStamina();
    const playerPoints = playerStats.getPlayerPoints();
    const playerKills = playerStats.getKills();

    const playerTeam = this.teamManager.getTeamName(
      this.teamManager.getPlayerTeam(player.username) ?? 1
    );

    // Removed playerTeams from frequent updates - now handled separately
    player.ui.sendData({
      type: UI_EVENT_TYPES.GAME_UI,
      time: timeStr,
      scores: scoreStr,
      playerTeam: playerTeam,
      playerStamina: playerStamina,
      maxStamina: maxStamina,
      playerPoints: playerPoints,
      playerKills: playerKills,
      playerName: playerStats.getDisplayName(),
      playerDeaths: playerStats.getPlayerDeaths(),
      playerClass: playerStats.getPlayerClass(),
    });
  }

  private endGame() {
    if (!this.isGameRunning) return;
    this.isGameRunning = false;

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
      `Game Over! ${winningTeamName} wins with ${highestScore} painted blocks!`,
      "FFFF00"
    );

    TO_THE_DEATH_MUSIC.pause();
    BACKGROUND_MUSIC.play(this.world);

    for (const player of PlayerManager.instance.getConnectedPlayers()) {
      const playerTeam = this.teamManager.getTeamName(
        this.teamManager.getPlayerTeam(player.username) ?? 1
      );
      if (playerTeam === winningTeamName) {
        player.ui.sendData({
          type: UI_EVENT_TYPES.VICTORY,
          winner: winningTeamName,
        });
      } else {
        player.ui.sendData({
          type: UI_EVENT_TYPES.DEFEAT,
          winner: winningTeamName,
        });
      }
    }

    // clear all non-player entities
    this.world.entityManager.getAllEntities().forEach((entity) => {
      if (
        !(entity instanceof PlayerEntity) &&
        !entity.name.includes("Paint Brush")
      ) {
        entity.despawn();
      }
    });

    // send all players to lobby
    this.teamManager.sendAllPlayersToLobby(this.world);

    this.countdownTimer.start();
    this.checkPlayerCount();
  }
}
