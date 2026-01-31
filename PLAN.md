# SlidePenguin Game - Architecture Plan

## Overview
A curling-inspired minigame in Decentraland SDK7 where players control a sliding penguin by clicking a swipe box to maintain momentum and reach the target area (Home01).

## System Architecture

### Core Systems
1. **Game State Manager** - Controls game flow (idle → countdown → playing → ended)
2. **Penguin Movement System** - Handles velocity, deceleration, and position updates
3. **Swipe Box System** - Creates and manages the clickable interaction box
4. **Trigger Detection System** - Monitors lose condition (TriggerLose area)
5. **Scoring System** - Calculates distance-based score from Home01 center
6. **UI System** - Displays countdown, score, and game state

## Component Breakdown

### Custom Components

#### GameState Component
```typescript
{
  state: 'idle' | 'countdown' | 'playing' | 'ended',
  countdownValue: number,  // 7, 6, 5, 4, 3, 2, 1, 0
  score: number,
  hasLost: boolean
}
```

#### PenguinMovement Component
```typescript
{
  velocity: Vector3,      // Current velocity vector
  initialSpeed: number,    // Starting speed magnitude
  decelerationRate: number, // Speed loss per second
  direction: Vector3      // Normalized direction toward Home01
}
```

#### SwipeBox Component
```typescript
{
  offset: Vector3,         // Offset from penguin position
  boostAmount: number,     // Speed boost when clicked
  isVisible: boolean       // Visibility state
}
```

### Entity References
- **Penguin Entity**: `EntityNames.Penguin_glb`
- **Home01 Entity**: `EntityNames.Home01_glb` (target center)
- **Buttons Entity**: `EntityNames.Buttons` (start trigger)
- **TriggerLose Entity**: `EntityNames.TriggerLose` (lose condition)

## Game State Management

### State Flow
```
IDLE → COUNTDOWN → PLAYING → ENDED
  ↑                              ↓
  └────────── RESET ─────────────┘
```

### State Transitions

1. **IDLE**
   - Wait for player to click Buttons entity
   - Penguin at starting position
   - No UI countdown visible

2. **COUNTDOWN**
   - Display countdown: "7... 6... 5... 4... 3... 2... 1... START!"
   - Update UI every second
   - Penguin remains stationary

3. **PLAYING**
   - Penguin begins moving with initial velocity
   - Swipe box becomes visible and follows penguin
   - Velocity decreases over time (deceleration)
   - Monitor for lose condition (TriggerLose)
   - Monitor for velocity reaching 0 (game end)

4. **ENDED**
   - Calculate final score based on distance to Home01 center
   - Display score in UI
   - Option to reset/restart

## Movement System

### Velocity Management
- **Initial Velocity**: Calculated from penguin position to Home01 center
- **Direction**: Normalized vector from penguin to Home01
- **Speed Calculation**: `speed = initialSpeed - (decelerationRate * elapsedTime)`
- **Position Update**: `position += velocity * deltaTime`

### Deceleration Formula
```
currentSpeed = max(0, initialSpeed - (decelerationRate * timeSinceStart))
velocity = direction * currentSpeed
```

### Swipe Boost
- When swipe box is clicked:
  - Add boost to current speed: `currentSpeed += boostAmount`
  - Clamp to maximum speed if needed
  - Visual feedback (optional animation/particle)

## Swipe Box System

### Box Properties
- **Position**: Follows penguin with offset (e.g., 2 units in front)
- **Size**: Visible clickable box (e.g., 1x1x1 units)
- **Material**: Semi-transparent (alpha ~0.5)
- **Collision**: Pointer events enabled
- **Visibility**: Only visible during PLAYING state

### Click Detection
- Use `pointerEventsSystem.onPointerDown` for click handling
- On click: boost penguin velocity
- Optional: Cooldown between swipes to prevent spam

## Trigger Detection

### Lose Condition
- Use `TriggerArea` component on TriggerLose entity
- Use `triggerAreaEventsSystem.onTriggerEnter` to detect penguin entry
- When triggered: Set game state to ENDED with `hasLost: true`

### Implementation
```typescript
// Set up trigger area on TriggerLose entity
TriggerArea.setBox(triggerLoseEntity)
// Listen for penguin entering
triggerAreaEventsSystem.onTriggerEnter(triggerLoseEntity, (event) => {
  if (event.trigger.entity === penguinEntity) {
    // Game lost
  }
})
```

## Scoring Algorithm

### Distance Calculation
1. Get penguin final position
2. Get Home01 center position (from Transform)
3. Calculate 2D distance (ignore Y-axis): `distance = sqrt((x1-x2)² + (z1-z2)²)`

### Score Formula
```
baseScore = 1000
distance = distance from penguin to Home01 center
maxDistance = maximum possible distance (scene bounds or predefined)
score = baseScore * (1 - (distance / maxDistance))
```

### Score Display
- Show score in UI when game ends
- Format: "Score: 850" or "You Lost!" if hasLost is true

## UI System

### Components
1. **Countdown Display**
   - Large centered text
   - Updates every second during countdown
   - Shows: "7", "6", "5", "4", "3", "2", "1", "START!"

2. **Score Display**
   - Shown after game ends
   - Format: "Final Score: 850" or "Game Over - You Lost!"

3. **Game State Indicator** (optional)
   - Small text showing current state for debugging

### UI State Management
- Use React state or component data to track UI visibility
- Conditional rendering based on game state

## File Structure

```
src/
├── index.ts              # Main entry point, entity setup
├── ui.tsx                # React ECS UI components
├── components.ts         # Custom component definitions
├── systems.ts           # Game systems (movement, state, triggers)
├── gameState.ts         # Game state management utilities
├── scoring.ts           # Scoring calculation utilities
└── constants.ts          # Game constants (speeds, distances, etc.)
```

## Implementation Order

1. **Phase 1: Foundation**
   - Create custom components (GameState, PenguinMovement, SwipeBox)
   - Set up entity references
   - Create basic game state manager

2. **Phase 2: Movement**
   - Implement penguin movement system
   - Add deceleration logic
   - Calculate direction to Home01

3. **Phase 3: Interactions**
   - Set up Buttons click handler (start game)
   - Create swipe box entity
   - Implement click detection and velocity boost

4. **Phase 4: Triggers & Scoring**
   - Set up TriggerLose detection
   - Implement distance calculation
   - Create scoring system

5. **Phase 5: UI**
   - Create countdown UI component
   - Create score display component
   - Connect UI to game state

6. **Phase 6: Polish**
   - Add visual feedback for swipes
   - Fine-tune deceleration rates
   - Test edge cases

## Technical Considerations

### SDK7 Limitations
- No physics engine - use manual velocity calculations
- Transform updates must be done via systems
- Pointer events require MeshCollider with CL_POINTER layer
- TriggerArea requires proper collision layer setup

### Performance
- Systems run every frame - keep calculations efficient
- Cache entity references to avoid repeated lookups
- Use component queries efficiently

### Entity Lookup
- Use `EntityNames` enum for entity name references
- May need to query entities by name if not directly accessible
- Consider caching entity IDs after initial lookup

## Constants & Configuration

```typescript
// Game constants
const INITIAL_SPEED = 5.0           // Units per second
const DECELERATION_RATE = 0.8       // Speed loss per second
const SWIPE_BOOST = 2.0             // Speed boost per swipe
const COUNTDOWN_DURATION = 7        // Seconds
const SWIPE_BOX_OFFSET = Vector3.create(0, 0, 2)  // In front of penguin
const MAX_SCORE = 1000              // Maximum possible score
```

## Testing Checklist

- [ ] Game starts when Buttons is clicked
- [ ] Countdown displays correctly (7 to START)
- [ ] Penguin moves toward Home01 after START
- [ ] Penguin decelerates over time
- [ ] Swipe box appears and follows penguin
- [ ] Clicking swipe box boosts velocity
- [ ] Game ends when velocity reaches 0
- [ ] Score calculates correctly based on distance
- [ ] TriggerLose area triggers lose condition
- [ ] UI updates correctly for all states
- [ ] Game can be reset/restarted
