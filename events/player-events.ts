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
import { getFallingMessage, getKillingMessage } from "../utilities/language";
import {
  RESPAWN_TIME,
  RESPAWN_INVINCIBILITY_TIME,
  RESPAWN_HEIGHT,
  UI_BUTTONS,
  UI_EVENT_TYPES,
} from "../utilities/gameConfig";

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
  const usernameSceneUI = new SceneUI({
    templateId: "name-indicator",
    attachedToEntity: playerEntity,
    state: { message: player.username, playerId: player.id },
    offset: { x: 0, y: 1.1, z: 0 },
  });

  player.ui.onData = (
    playerUI: PlayerUI,
    data: {
      button?: string;
      class?: string;
      type?: string;
      name?: string;
      team?: string;
    }
  ) => {
    if (data.type === "set-name" && data.name) {
      playerDataManager.setPlayerName(playerUI.player.id, data.name);
      usernameSceneUI.setState({
        playerName: data.name,
        color: teamManager.getPlayerColor(playerUI.player.id),
        playerId: playerUI.player.id,
      });
    }

    if (data.button === "select-team" && data.team) {
      playerUI.player.camera.setAttachedToEntity(playerEntity);

      if (data.team === "Red") {
        teamManager.addPlayerToTeam(playerUI.player.id, TEAM_COLORS.RED);
      } else if (data.team === "Blue") {
        teamManager.addPlayerToTeam(playerUI.player.id, TEAM_COLORS.BLUE);
        playerUI.player.camera.setAttachedToEntity(playerEntity);
      }
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

  const playerName = playerDataManager.getPlayerName(player.id);
  usernameSceneUI.setState({
    playerName,
    color: teamManager.getPlayerColor(player.id),
    playerId: player.id,
  });

  usernameSceneUI.load(world);

  const messages = [
    "Welcome! Use WASD to move around.",
    "Press space to jump.",
    "If you get stuck, use /stuck to respawn",
    "Hold shift to sprint.",
    "Press left mouse button to shoot.",
    "Press Q or left mouse to punch.",
    "Press E to open the class menu. Use 1, 2, 3, or 4 to change class quickly.",
    "Press R to view the leaderboard.",
    "Type /set-name to set your name.",
  ];

  messages.forEach((message) => {
    world.chatManager.sendPlayerMessage(player, message);
  });
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
    time: RESPAWN_TIME / 1000,
  });
  const killed = playerDataManager.getPlayer(entity.player.id);
  if (killed) {
    killed.playerDeaths++;
    if (killed.lastHitBy) {
      const killer = playerDataManager.getPlayer(killed.lastHitBy);
      chatManager.sendBroadcastMessage(
        getKillingMessage(killer.name, killed.name),
        "FF0000"
      );
      killer.kills++;
      killed.lastHitBy = "";
    } else {
      chatManager.sendBroadcastMessage(
        getFallingMessage(killed.name),
        "FF0000"
      );
    }
  }

  // Make player spectator during respawn
  entity.setPosition({ x: 0, y: RESPAWN_HEIGHT, z: 0 });
  if (entity.rawRigidBody) {
    entity.rawRigidBody.setEnabled(false);
  }
  entity.setLinearVelocity({ x: 0, y: 0, z: 0 });

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
  playerDataManager.setPlayerInvincible(entity.player.id, true);
  setTimeout(() => {
    playerDataManager.setPlayerInvincible(entity.player.id, false);
  }, RESPAWN_INVINCIBILITY_TIME);
}
