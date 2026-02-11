# Slide Penguin

**Welcome to Slide Penguin!**

Penguins love to slide on the ice, but they're too indecisive to know when to swipe! One penguin slides while another sweeps the ice in front of them — you just need to tell the sweeper when to go! Get your penguin as close to home as possible to climb the leaderboard.

*Game created for the Community Winterfest Games event.*  
*Made with love by the DCL Regenesis Labs team.*

---

## What is this?

**Slide Penguin** is a **Decentraland SDK 7** scene: a small ice-sliding game where you time your swipes to help a penguin slide as far as possible toward home. The sliding penguin slows down over time; each swipe reduces deceleration for a short period so the penguin keeps moving. Your score is based on how close you stop to the home target (up to 1000 points). There’s a lose zone — if the penguin enters it, the run ends with a loss.

---

## How to play

1. **Start** — Click the **Start** button, or talk to the penguin friend and choose “Yes” to begin.
2. **Countdown** — A 3–2–1 countdown runs; when it hits zero, the sliding penguin starts moving toward home.
3. **Swipe** — Press **E** (primary action) to “sweep” the ice. Each swipe temporarily reduces how quickly the penguin slows down, so you can reach home. You can only swipe while the sweeper penguin is still on the track (before the stop line).
4. **Goal** — Get the sliding penguin as close as possible to **Home** before it stops. Closer = higher score (max 1000). Avoid the lose zone.
5. **Play again** — After the run ends, use “Play Again” to respawn and start a new round.

---

## Tech overview (for developers)

- **Runtime:** Decentraland SDK 7 (ECS, `@dcl/sdk`).
- **Entry:** `src/index.ts` — creates entities, registers systems, and sets up the UI.

### Main systems (`src/systems.ts`)

- **gameStateSystem** — Countdown (3 s), transition to `playing`, and initializes penguin movement.
- **penguinMovementSystem** — Moves the sliding penguin with velocity + deceleration; applies swipe-based deceleration reduction; moves broom and sweeper penguin in sync; checks lose zone and “stopped” to end the run.
- **swipeInputSystem** — Listens for **E** (IA_PRIMARY) and triggers a swipe (broom/sweeper animations + deceleration reduction).
- **animationTransitionSystem** — Weight-based crossfades for Penguin, Broom, and PenguinPlayer GLB animations.
- **penguinFriendShakeSystem** — Simple Y-scale bounce on the friend penguin when you interact.

### Components (`src/components.ts`)

- **GameState** — `idle` | `countdown` | `playing` | `ended`, countdown value, score, distance to home, canSwipe, dialogs, countdown shake.
- **PenguinMovement** — Velocity, speed, deceleration, direction, swipe-related timers.
- **SwipeBox** — Swipe cooldown and boost (no visible box; swipe is E-key only).
- Tag components for Penguin, Broom, PenguinPlayer, HomeTarget, StartButton, LoseTrigger.

### Scoring (`src/scoring.ts`)

- Score = `MAX_SCORE * (1 - normalizedDistance)` (0–1000). Closer to home = higher score.
- Distance is 2D (XZ); home position comes from the Home01 entity.

### Tuning (`src/constants.ts`)

- `INITIAL_SPEED`, `DECELERATION_RATE`, `SWIPE_DECELERATION_REDUCTION`, `SWIPE_DECELERATION_DURATION` — slide feel and swipe impact.
- `COUNTDOWN_DURATION`, `PENGUIN_PLAYER_STOP_Z`, `PLAYER_INITIAL_POSITION` / `PLAYER_INITIAL_CAMERA_TARGET` — game flow and “Play Again” teleport.
- Animation and audio-related constants for transitions, broom swipe length, and friend bounce.

### UI (`src/ui/`)

- **RootUi** — Chooses screen from game state: FriendDialog (idle), CountdownOverlay, PlayingHud (distance, canSwipe), EndedPanel (score, distance, hasLost, Play Again).
- Reusable pieces: `FrostyButton`, `RoundedPanel`; screens in `screens/`.

### Scene

- Scene layout and models (Penguin, Broom, PenguinPlayer, Home01, triggers, etc.) are in **Creator Hub** / `assets/scene/` (e.g. `main.composite`, GLBs, audio). Entity names (e.g. `Penguin.glb`, `Broom.glb`, `Home01.glb`, `Buttons`, `TriggerLose`, `PenguinFriend.glb`) are used in code to look up entities.

---

## Run & deploy

- **Preview:** `npm run start` (or your project’s start script).
- **Deploy:** Use your usual Decentraland deploy flow (e.g. `npm run deploy` if configured).

Requires Node ≥16 and the Decentraland SDK 7 tooling.

---

## Summary

Slide Penguin is a Decentraland SDK 7 game: one penguin slides on ice, another sweeps; you press **E** to sweep and reduce deceleration so the sliding penguin gets as close to home as possible. Score is 0–1000 by distance to home; avoid the lose zone. The README above reflects the current code and design.
