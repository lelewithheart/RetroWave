# RogueWave – Survivor Roguelite

A polished, modular **Survivor-Roguelite** game built with Vanilla JavaScript and HTML5 Canvas, ready for **CrazyGames SDK v3**.

## 🎮 Play

Open `index.html` in any modern browser — no build step required.

## ✨ Features

| Feature | Details |
|---|---|
| **Engine** | `requestAnimationFrame` game-loop with delta-time; runs smoothly at 60 Hz and 144 Hz |
| **Input** | Uses `event.code` (`KeyW`, `KeyA`, …) — works on QWERTY, AZERTY, QWERTZ, and more |
| **Game States** | `START_MENU` → `GAMEPLAY` → `UPGRADE_SCREEN` / `SETTINGS` → `GAME_OVER` |
| **Waves** | Enemy count, HP, and speed scale per wave |
| **XP & Level-Up** | Collect XP orbs → pick 1 of 3 random power-ups (damage, fire-rate, speed, HP, etc.) |
| **Particles** | Explosions on enemy death and player hit |
| **Screen Shake** | Camera shake on hits for juicy feedback |
| **Lerp Camera** | Smooth, exponential-decay camera follow |
| **HUD** | HP bar, XP bar, wave counter, kill count, timer |
| **Settings** | Sound/Music toggles, controls reference |
| **CrazyGames SDK** | Full v3 integration: midgame/rewarded ads, per-difficulty leaderboards, user auth, platform mute settings |

## 🕹️ Controls

| Action | Keys |
|---|---|
| Move | `W` `A` `S` `D` / Arrow Keys |
| Select upgrade | `1` `2` `3` |
| Settings / Back | `Escape` |
| Start / Restart | `Enter` |

> Input uses `event.code`, so physical key positions stay the same regardless of keyboard layout.

## 🏗️ Architecture

All code lives in a **single `index.html`** file for rapid prototyping, but is logically separated into clearly commented sections:

| Section | Description |
|---|---|
| §1 | Constants & configuration |
| §2 | Canvas setup |
| §3 | Utility functions (`lerp`, `clamp`, `dist`, …) |
| §4 | Input manager (`event.code` based) |
| §5 | Mouse / pointer (for menus) |
| §6 | Camera (lerp follow + screen-shake) |
| §7 | `Entity` base class |
| §8 | `Player` class |
| §9 | `Projectile` class |
| §10 | `Enemy` class |
| §11 | `XPOrb` class |
| §12 | `Particle` class |
| §13 | Upgrade definitions |
| §14 | CrazyGames SDK v3 integration (ads, leaderboards, user, settings) |
| §15 | Settings store |
| §16 | UI / HUD helpers |
| §17 | Main game object (states, waves, spawning, drawing) |
| §18 | Main loop (`requestAnimationFrame` + delta-time) |

## 📦 CrazyGames SDK Integration

The `CrazyGamesSDK` module provides full CrazyGames SDK v3 integration:

| Feature | Details |
|---|---|
| **Ads** | `requestMidroll()` (midgame ads between waves), `requestRewarded()` (rewarded ads, returns promise) — audio is automatically muted during ads |
| **Lifecycle** | `gameplayStart()` / `gameplayStop()` / `happyTime()` — notifies the platform of game state changes |
| **Leaderboards** | Per-difficulty leaderboards (`roguewave-easy`, `roguewave-normal`, `roguewave-hard`) — scores submitted automatically on game over for logged-in users |
| **User** | `getUser()` / `promptLogin()` — user authentication and sign-in prompt |
| **Settings** | Listens for platform `muteAudio` changes and syncs with in-game sound/music toggles |
| **Data** | `saveData()` / `loadData()` — cloud persistence via `SDK.data` with localStorage fallback |

### Leaderboard Setup

Create three leaderboards in the [CrazyGames Developer Portal](https://developer.crazygames.com/) with these IDs:
- `roguewave-easy`
- `roguewave-normal`
- `roguewave-hard`

Score formula: `wave × 100000 + kills × 100 + seconds_survived`

The SDK gracefully degrades — when running outside CrazyGames (standalone), all SDK calls are no-ops and the game uses local high scores only.