// This file contains the player join, leave, death, and respawn events
import {
  Player,
  World,
  PlayerEntity,
  Entity,
  PlayerEntityController,
  PlayerUI,
  SceneUI,
  ChatManager,
} from "hytopia";
import { onTickWithPlayerInput } from "./player-input";
import type Game from "../gameState/game";
import { type PlayerDataManager, PlayerClass } from "../gameState/player-data";
import type TeamManager from "../gameState/team";
import type GameMap from "../gameState/map";
import { TEAM_COLORS } from "../gameState/team";
import { getFunnyFallingMessage, getFunnyKillingMessage } from "../utilities/language";
import { RESPAWN_TIME, RESPAWN_INVINCIBILITY_TIME, RESPAWN_HEIGHT, UI_BUTTONS, UI_EVENT_TYPES } from "../utilities/gameConfig";

export const LOBBY_SPAWN = { x: 0, y: 65, z: 0 };

export function onPlayerJoin(
  player: Player,
  world: World,
  teamManager: TeamManager,
  game: Game,
  playerDataManager: PlayerDataManager,
  map: GameMap
) {
  teamManager.addPlayerToMinTeam(player.id);

  const team = teamManager.getPlayerTeam(player.id);
  const playerEntity = new PlayerEntity({
    player,
    name: "Player",
    modelUri:
      team === TEAM_COLORS.BLUE
        ? "models/players/player-blue.gltf"
        : "models/players/player-red.gltf",
    modelLoopedAnimations: ["idle"],
    modelScale: 0.5,
  });

  if (game.isGameRunning) {
    playerEntity.spawn(
      world,
      teamManager.getTeamSpawn(team ?? 0) ?? LOBBY_SPAWN
    );
  } else {
    const randomLobbySpawn = {
      x: LOBBY_SPAWN.x + (Math.random() * 3 - 1),
      y: LOBBY_SPAWN.y,
      z: LOBBY_SPAWN.z + (Math.random() * 3 - 1),
    };
    playerEntity.spawn(world, randomLobbySpawn);
  }

  playerDataManager.setPlayerClass(player.id, PlayerClass.SLINGSHOT);
  playerDataManager.setPlayerName(player.id, player.username);
  player.camera.setFov(80);
  player.camera.setOffset({ x: 0, y: 1, z: 0 });

  playerEntity.onTick = (entity: Entity) => {
    if (entity instanceof PlayerEntity && entity.position.y < -8) {
      handlePlayerDeath(
        entity as PlayerEntity,
        teamManager,
        playerDataManager,
        world.chatManager,
        game
      );
    }
  };

  playerEntity.controller!.onTickWithPlayerInput = function (
    entity,
    input,
    cameraOrientation,
    deltaTimeMs
  ) {
    if (playerEntity?.controller instanceof PlayerEntityController) {
      onTickWithPlayerInput.call(
        playerEntity.controller,
        entity,
        input,
        cameraOrientation,
        deltaTimeMs,
        teamManager,
        playerDataManager,
        world
      );
    }
  };

  player.ui.load("ui/hud.html");

  player.ui.onData = (
    playerUI: PlayerUI,
    data: { button?: string; class?: string; type?: string; name?: string }
  ) => {
    if (data.type === "set-name" && data.name) {
      playerDataManager.setPlayerName(playerUI.player.id, data.name);
    }

    if (!data.button) return;

    if (data.button === UI_BUTTONS.SWITCH_TEAM) {
      teamManager.switchTeam(playerUI.player.id);
    } else if (data.button === UI_BUTTONS.RESTART_GAME) {
      game.restartGame();
    } else if (data.button === UI_BUTTONS.SELECT_CLASS && data.class) {
      playerDataManager.setPlayerClass(
        playerUI.player.id,
        data.class as PlayerClass
      );
    } else if (data.button === UI_BUTTONS.SWITCH_MAP) {
      map.switchMap();
    }
  };

  // we store the player id in the local storage so we can use it to hide the player's own name bar
  player.ui.sendData({
    type: UI_EVENT_TYPES.PLAYER_ID,
    playerId: player.id,
  });

  const usernameSceneUI = new SceneUI({
    templateId: "name-indicator",
    attachedToEntity: playerEntity,
    state: { message: player.username, playerId: player.id },
    offset: { x: 0, y: 1.1, z: 0 },
  });

  const playerName = playerDataManager.getPlayerName(player.id);
  usernameSceneUI.setState({
    playerName,
    color: teamManager.getPlayerColor(player.id),
    playerId: player.id,
  });

  usernameSceneUI.load(world);

  world.chatManager.sendPlayerMessage(
    player,
    "Welcome! Use WASD to move around."
  );
  world.chatManager.sendPlayerMessage(player, "Press space to jump.");
  world.chatManager.sendPlayerMessage(player, "Hold shift to sprint.");
  world.chatManager.sendPlayerMessage(
    player,
    "Press left mouse button to shoot."
  );
  world.chatManager.sendPlayerMessage(player, "Press Q button to punch.");
  world.chatManager.sendPlayerMessage(player, "Press E to select your class.");
  world.chatManager.sendPlayerMessage(
    player,
    "Press R to view the leaderboard."
  );
  world.chatManager.sendPlayerMessage(
    player,
    "Type /set-name to set your name."
  );
}

export function onPlayerLeave(
  player: Player,
  world: World,
  teamManager: TeamManager,
  playerDataManager: PlayerDataManager
) {
  teamManager.removePlayer(player.id);
  playerDataManager.removePlayer(player.id);
  world.entityManager
    .getPlayerEntitiesByPlayer(player)
    .forEach((entity) => entity.despawn());
}

export function handlePlayerDeath(
  entity: PlayerEntity,
  teamManager: TeamManager,
  playerDataManager: PlayerDataManager,
  chatManager: ChatManager,
  game: Game
) {
  if (entity.position.y === RESPAWN_HEIGHT) return; // dont respawn if player is already dead
  entity.player.ui.sendData({
    type: UI_EVENT_TYPES.PLAYER_DEATH,
    message: "You fell off the map!",
    time: RESPAWN_TIME / 1000
  });
  const playerStats = playerDataManager.getPlayer(entity.player.id);
  if (playerStats) {
    playerStats.playerDeaths++;
    const killed = playerDataManager.getPlayerName(entity.player.id);
    if (playerStats.lastHitBy) {
      const killer = playerDataManager.getPlayerName(playerStats.lastHitBy);
      chatManager.sendBroadcastMessage(
        getFunnyKillingMessage(killer, killed),
        "FF0000"
      );
      playerDataManager.addKill(playerStats.lastHitBy);
      playerDataManager.setLastHitBy(entity.player.id, "");
    } else {
      chatManager.sendBroadcastMessage(getFunnyFallingMessage(killed), "FF0000");
    }
  }

  // Make player spectator during respawn
  entity.setPosition({ x: 0, y: RESPAWN_HEIGHT, z: 0 });
  if (entity.rawRigidBody) {
    entity.rawRigidBody.setEnabled(false);
  }

  setTimeout(() => {
    respawnPlayer(entity as PlayerEntity, teamManager, playerDataManager, game);
  }, RESPAWN_TIME);
}

export function respawnPlayer(
  entity: PlayerEntity,
  teamManager: TeamManager,
  playerDataManager: PlayerDataManager,
  game: Game
) {
  // Get team spawn point
  if (!entity.isSpawned) return;

  const team = teamManager.getPlayerTeam(entity.player.id);
  const spawn = teamManager.getTeamSpawn(team ?? 0) ?? LOBBY_SPAWN;
  // Re-enable physics and move to spawn
  entity.rawRigidBody?.setEnabled(true);

  // currently a bug with opacity dont use it now
  // entity.setOpacity(0.3)
  // setTimeout(() => {
  //   entity.setOpacity(1)
  // }, 3000)
  if (game.isGameRunning) {
    entity.setPosition(spawn);
  } else {
    entity.setPosition(LOBBY_SPAWN);
  }
  playerDataManager.setPlayerRespawning(entity.player.id, true);
  setTimeout(() => {
    playerDataManager.setPlayerRespawning(entity.player.id, false);
  }, RESPAWN_INVINCIBILITY_TIME);
}
