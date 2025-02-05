# Block Splat - Hytopia Game Jam 2025

## Table of Contents

- [Gameplay](#gameplay)
- [Installation](#installation)
- [Commands](#commands)
- [Configuration](#configuration)
- [Social Features](#social-features)
- [Play test results and feedback](#play-test-results-and-feedback)
- [Future Features](#future-features)
- [Continuous Deployment](#continuous-deployment)
- [Credits](#credits)

## Gameplay

Block Splat is a fast paced PVP game where players compete to cover the majority of the map by running and shooting projectiles. It's best played with 4-10 players given the map size but could be played with more.

When joining the game you will be spawned in a glass lobby above the map. Type /start to begin the game. Currently player's are assigned to a team when they join the game, with the goal of keeping teams as balanced as possible. I chose not to add team selection for the purposes of keeping this demo simple.

When the game starts player's can run around and shoot projectiles and punch other players, if they're smart they will focus on coloring as many blocks as possible to score points for their team and steal points from other teams. Blocks can be colored by running around the map or by shooting projectiles. Blocks colors are overwritted each time theyre hit with a paintball of a different color.

To encourage more movement, boosts spawn around the map and can be picked up to gain power ups during the game. Strength increases knockback and punch force for the specified time interval while the energy drink increases your stamina. The invincibility boost allows you to be immune to knockback for the specified time interval.

## Demo

[Live video showcase](https://youtu.be/OvSbGs74PyQ)

[Older gameplay footage](https://x.com/AdonisOnX/status/1886064643870773467)

![Boost image](/screenshots/boosts.png)


## Classes

There are 4 classes to choose from to encourage variety in gameplay, easily move between them by pressing 1, 2, 3, or 4 or press e to open the class selection menu:
- Runner: Colors blocks by running around the map!
- Grenader: Area control with heavy knockback but harder to aim
- Sniper: Long range, fast bullets, but a small spray radius. Good for sniping players from a distance.
- Slingshot: Spray shots, higher stamina cost lower knockback but best class for quick coloring

## Installation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun --watch index.ts
```

## Commands

- `/start` - Start the game - a current limitation is that anyone can start the game. I decided to leave it like this to make things easier to test. However, I will ultimately setup an automated system for handling the game lobby and when to start a new game based on player count.

- `/set-name <name>` - Sets your name on the leaderboard and the indicator above your head

- `/change-team` - Change your team - this will not update a player model to match their new team color and was put in place mainly for testing purposes.

- `/stuck` - Respawns player - can be used if you get stuck in a block

## Configuration

To help facilitate quick play testing, I created the [gameConfig.ts](utilities/gameConfig.ts) file that contains a large number of configuration options such as game time, boost spawn interval, knockback, and more. This file can be tweaked to change the game rules and balance quickly in one place. Feel free to clone this repo and change the configuration to make the game your own!

## Social Features

- Player Leaderboard during each match to follow along with your stats
- Kill tracking with randomized global messages
- A set name command to set your name with a name indicator above your head, used local storage to persist across play sessions from the same browser.

![Leaderboard image](/screenshots/leaderboard.png)
![Kill messages](/screenshots/killmessages.png)

## Play test results and feedback

I ran a play test with some friends midway through the jam and gathered some valuable feedback that influenced the final game. Here are some of the important changes:

1. Changing classed via the UI was not a good user experience, players can now change classes with the number keys.
2. Friendly fire is fun but should be toggled off by default.
3. Standing at a high ground and spraying as slingshot was OP, I buffed the other classes and created a new sniper class that can snipe players from a distance.
4. Slightly increase respawn time to make kills more rewarding and increased player knockback immunity duration after respawning.
5. Updated the bottom of the map so those blocks can't have their color changed so its harder to hit blocks when falling off the map and less block entities may help with performance.
6. Added boosts for some more variety in gameplay and to force players to move around the map.
7. 5 minutes was a little too long, make gameplay quicker

## Future Plans

Future plans for the game to make it playable and more fun once Hytopia launches. If any of these changes interest you, feel free to open up a PR or reach out to me!

- Better animations for the character model and animations for projectile hits to make gameplay smoother and more satisfying.
- More benefits to classes and make them more unique with custom models.
- kill streak rewards
- More maps with unique designs and team bases
- Different game modes like only runners or increased knockback
- UI code got out of hand in an effort to move fast, id like to refactor it in the future so it's easier to modify
- explore mobile friendly controls along with UI refactor
- better lobby experience with more intuitive instructions
- boost indicators 

## Continuous Deployment

This repo has a github action which automatically deploys a docker image to my azure container registry making it easy to deploy game instaces to a server when needed for testing and gameplay.

## Credits

Used models and music from the following sources, all other assets are original or came from the Hytopia asset library:

- [Hytopia SDK](https://dev.hytopia.com) - Game engine
- [Strength Boost Model](https://sketchfab.com/3d-models/strength-up-9b2c543b66914721b772ba8dbf8455da)
- [Energy Drink Model](https://sketchfab.com/3d-models/cold-energy-drink-a7c77ba7ff844fd78d3a429865181b9e)
- [Invincibility Boost Model](https://sketchfab.com/3d-models/potion-bottle-heart-64d3d02fa816415987d4585919dae0c6)
- [Battle Music](https://freesound.org/people/InspectorJ/sounds/613009/)
- [To The Death Music](https://pixabay.com/music/video-games-to-the-death-159171/)
- [Class Icons](https://captaincatsparrow.itch.io/25-free-hunter-skill-icons)