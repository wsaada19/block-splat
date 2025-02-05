# Block Splat - Hytopia Game Jam 2025

Block Splat is a fast paced PVP game where players compete to cover the majority of the map by running and shooting projectiles. It's best played with 6-12 players given the map size and potential lag issues with so many entities being spawned.

When joining the game you will be spawned in a glass lobby above the map. Type /start to begin the game. Currently player's are assigned to a team when they join the game, with the goal of keeping teams as balanced as possible. I chose not to add team selection for the purposes of keeping the demo simple. There's a secret /change-team command that allows you to switch teams (it will not update a player's model to match their team color) and was put in place mainly for testing purposes.

When the game starts player's can run around and shoot projectiles or punch other players or if they're smart focus on coloring as many blocks as possible to score points for their team. Energy and strength boosts will spawn around the map and can be picked up to gain temporary boosts during the game. Strength increases knockback and punch force while energy boosts increase your stamina.

There are 4 classes to choose from, easily move between them by pressing 1, 2, 3, or 4:
- Runner: Colors blocks by running around the map!
- Grenader: Area control with heavy knockback but harder to aim
- Sniper: Long range, fast bullets, but a small spray radius. Good for sniping players from a distance.
- Slingshot: Spray shots, higher stamina cost lower knockback but best class for quick coloring

## Table of Contents

- [Installation](#installation)
- [Commands](#commands)
- [Configuration](#configuration)
- [Social Features](#social-features)
- [Play test results and feedback](#play-test-results-and-feedback)
- [Future Features](#future-features)
- [Continuous Deployment](#continuous-deployment)
- [Credits](#credits)

## Installation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun --watch index.ts
```

- `/start` - Start the game - a current limitation is that anyone can start the game. I decided to leave it like this to make things easier to test. However, I will ultimately setup an automated system for handling the game lobby and when to start a new game based on player count.

- `/set-name <name>` - Sets your name

- `/toggle-friendly-fire` - Toggles friendly fire on and off

## Configuration

To help facilitate quick play testing, I created the gameConfig.ts file that contains a large number of configuration options. This file can be tweaked to change the game rules and balance quickly in one place. Feel free to clone this repo and change the configuration to make it your own!

## Social Features

- Player Leaderboard during each match to follow along with your stats
- Kill tracking with randomized funny global messages
- A set name command to set your name with a name indicator above your head, used local storage to persist across sessions.

## Play test results and feedback

1. Changing classed via the UI was not a good user experience, I changed it so the player can change class with the number keys.
2. Friendly fire is fun but there should be a way to toggle it on and off.
3. Standing at a high ground and spraying as slingshot was too OP, I buffed the other classes and created a new sniper class that can snipe players from a distance.
4. Slightly increase respawn time to make kills more rewarding and increased player knockback immunity duration after respawning.
5. Updated the bottom of the map so those blocks can't have their color changed so its harder to hit blocks when falling off the map and less block entities may help with performance.
6. Added boosts for some more variety in gameplay and to force players to move around the map.
7. 5 minutes was a little too long, make gameplay quicker

## Future Features

- Better animations for the character model and animations for projectile hits to make gameplay smoother and more satisfying.
- More classes
- optimize performance 
- kill streak rewards
- More maps with unique designs and team bases
- Different game modes like only runners
- UI code got out of hand in an effort to move fast, id like to refactor it in the future so it's easier to modify
- explore mobile friendly controls along with UI refactor

## Continuous Deployment

This repo has a github action which automatically deploys a docker image to my azure container registry making it easy to deploy game instaces to a server when needed.

## Credits

Used models and music from the following sources, all other assets are original or came from the Hytopia asset library:

- [Hytopia SDK](https://dev.hytopia.com) - Game engine
- [Strength Boost Model](https://sketchfab.com/3d-models/strength-up-9b2c543b66914721b772ba8dbf8455da)
- [Energy Drink Model](https://sketchfab.com/3d-models/cold-energy-drink-a7c77ba7ff844fd78d3a429865181b9e)
- [Battle Music](https://freesound.org/people/InspectorJ/sounds/613009/)
- [To The Death Music](https://pixabay.com/music/video-games-to-the-death-159171/)