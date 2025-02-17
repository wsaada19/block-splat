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
import { PlayerClass } from "../gameState/player-data";
import type TeamManager from "../gameState/team";
import type GameMap from "../gameState/map";
import { TEAM_COLORS } from "../gameState/team";
import { getFallingMessage, getKillingMessage } from "../utilities/language";
import {
  RESPAWN_TIME,
  RESPAWN_HEIGHT,
  UI_BUTTONS,
  UI_EVENT_TYPES,
} from "../utilities/gameConfig";
import CustomPlayerEntity from "../entities/CustomPlayerEntity";
import { globalState } from "../gameState/global-state";

export const LOBBY_SPAWN = { x: 0, y: 65, z: 0 };

export function onPlayerJoin(
  player: Player,
  world: World,
  teamManager: TeamManager,
  game: Game,
  map: GameMap
) {
  teamManager.addPlayerToMinTeam(player.id);

  const team = teamManager.getPlayerTeam(player.id);
  const playerEntity = new CustomPlayerEntity(player, team || 0);

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
    game.checkPlayerCount();
  }
  const paintBrush = new Entity({
    name: "Paint Brush",
    modelUri: "models/items/paint-brush.gltf",
    modelScale: 1.5,
    parent: playerEntity,
    parentNodeName: "hand_right_weapon_anchor",
  });
  paintBrush.spawn(world, { x: 0, y: 0, z: 0 });
  paintBrush.setRotation({ x: 0, y: 0, z: 20, w: 1 });
  playerEntity.setPlayerClass(PlayerClass.SLINGSHOT);
  playerEntity.setDisplayName(player.username);
  player.camera.setFov(80);
  player.camera.setOffset({ x: 0, y: 1, z: 0 });

  playerEntity.onTick = (entity: Entity) => {
    if (entity instanceof PlayerEntity && entity.position.y < -8) {
      handlePlayerDeath(
        entity as CustomPlayerEntity,
        teamManager,
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
        entity as CustomPlayerEntity,
        input,
        cameraOrientation,
        deltaTimeMs,
        teamManager,
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
      playerEntity.setDisplayName(data.name);
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
      playerEntity.setPlayerClass(data.class as PlayerClass);
    } else if (data.button === UI_BUTTONS.SWITCH_MAP) {
      map.switchMap();
    }
  };

  // we store the player id in the local storage so we can use it to hide the player's own name bar
  player.ui.sendData({
    type: UI_EVENT_TYPES.PLAYER_ID,
    playerId: player.id,
  });

  usernameSceneUI.setState({
    playerName: playerEntity.getDisplayName(),
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
) {
  teamManager.removePlayer(player.id);
  world.entityManager
    .getPlayerEntitiesByPlayer(player)
    .forEach((entity) => entity.despawn());
}

export function handlePlayerDeath(
  entity: CustomPlayerEntity,
  teamManager: TeamManager,
  chatManager: ChatManager,
  game: Game
) {
  if (entity.position.y === RESPAWN_HEIGHT) return; // dont respawn if player is already dead
  entity.player.ui.sendData({
    type: UI_EVENT_TYPES.PLAYER_DEATH,
    message: "You fell off the map!",
    time: RESPAWN_TIME / 1000,
  });

  entity.incrementPlayerDeaths();
  if (entity.getLastHitBy()) {
    const killer = globalState.getPlayerEntity(entity.getLastHitBy());
    chatManager.sendBroadcastMessage(
      getKillingMessage(killer.name, entity.name),
      "FF0000"
    );
    killer.incrementKills();
    entity.setLastHitBy("");
  } else {
    chatManager.sendBroadcastMessage(getFallingMessage(entity.name), "FF0000");
  }

  // Make player spectator during respawn
  entity.setPosition({ x: 0, y: RESPAWN_HEIGHT, z: 0 });
  if (entity.rawRigidBody) {
    entity.rawRigidBody.setEnabled(false);
  }
  entity.setLinearVelocity({ x: 0, y: 0, z: 0 });

  setTimeout(() => {
    respawnPlayer(entity, teamManager, game);
  }, RESPAWN_TIME);
}

export function respawnPlayer(
  entity: CustomPlayerEntity,
  teamManager: TeamManager,
  game: Game
) {
  // Get team spawn point
  if (!entity.isSpawned) return;

  const team = teamManager.getPlayerTeam(entity.player.id);
  const spawn = teamManager.getTeamSpawn(team ?? 0) ?? LOBBY_SPAWN;
  entity.rawRigidBody?.setEnabled(true);

  if (game.isGameRunning) {
    entity.setPosition(spawn);
  } else {
    entity.setPosition(LOBBY_SPAWN);
  }
  entity.setInvincible(true);
}
