import ReactEcs, { ReactEcsRenderer, UiEntity, Label, Button } from '@dcl/sdk/react-ecs'
import { engine, Entity } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import { GameState } from './components'
import { restartGame } from './systems'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}

const uiComponent = () => {
  // Find game state entity dynamically
  let gameStateEntity: Entity | null = null
  for (const [entity] of engine.getEntitiesWith(GameState)) {
    gameStateEntity = entity
    break
  }

  if (!gameStateEntity || !GameState.has(gameStateEntity)) {
    return null
  }

  const gameState = GameState.get(gameStateEntity)
  const state = gameState.state
  const countdownValue = gameState.countdownValue
  const score = gameState.score
  const hasLost = gameState.hasLost
  const distanceToHome = gameState.distanceToHome
  const canSwipe = gameState.canSwipe ?? true

  // Show countdown during countdown phase
  if (state === 'countdown') {
    const displayText = countdownValue > 0 ? countdownValue.toString() : 'START!'
    
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          positionType: 'absolute'
        }}
      >
        <Label
          value={displayText}
          fontSize={72}
          color={Color4.White()}
          textAlign="middle-center"
          uiTransform={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
      </UiEntity>
    )
  }

  // Show distance and swipe hint during playing state
  if (state === 'playing') {
    const distanceText = `${distanceToHome.toFixed(1)}m to Home`
    
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          positionType: 'absolute'
        }}
      >
        {/* Top: Distance display */}
        <UiEntity
          uiTransform={{
            width: 300,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 15,
            margin: { top: 20 }
          }}
          uiBackground={{
            color: Color4.create(0, 0, 0, 0.7)
          }}
        >
          <Label
            value={distanceText}
            fontSize={32}
            color={Color4.White()}
            textAlign="middle-center"
          />
        </UiEntity>

        {/* Bottom: Swipe hint (only while PenguinPlayer is before z58) */}
        {canSwipe && (
          <UiEntity
            uiTransform={{
              width: 280,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
              margin: { bottom: 40 }
            }}
            uiBackground={{
              color: Color4.create(0.1, 0.5, 0.9, 0.85)
            }}
          >
            <Label
              value="Press E to Swipe!"
              fontSize={24}
              color={Color4.White()}
              textAlign="middle-center"
            />
          </UiEntity>
        )}
      </UiEntity>
    )
  }

  // Show score after game ends
  if (state === 'ended') {
    const distanceText = hasLost 
      ? '' 
      : `Distance: ${distanceToHome.toFixed(1)}m`
    const scoreText = hasLost
      ? 'YOU LOST!'
      : `Score: ${score} points`
    const displayText = hasLost
      ? 'YOU LOST!'
      : `${scoreText}\n${distanceText}`

    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          positionType: 'absolute'
        }}
      >
        <UiEntity
          uiTransform={{
            width: 600,
            height: hasLost ? 300 : 320,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 30
          }}
          uiBackground={{
            color: hasLost 
              ? Color4.create(0.8, 0.1, 0.1, 0.9) // Red background for lose
              : Color4.create(0, 0, 0, 0.8) // Dark background for win
          }}
        >
          {/* Lose Banner or Score */}
          <Label
            value={hasLost ? 'YOU LOST!' : scoreText}
            fontSize={hasLost ? 64 : 48}
            color={hasLost ? Color4.White() : Color4.Green()}
            textAlign="middle-center"
            uiTransform={{
              width: '100%',
              height: hasLost ? 120 : 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: { bottom: 10 }
            }}
          />
          
          {/* Distance display (only if not lost) */}
          {!hasLost && (
            <Label
              value={distanceText}
              fontSize={36}
              color={Color4.Yellow()}
              textAlign="middle-center"
              uiTransform={{
                width: '100%',
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: { bottom: 20 }
              }}
            />
          )}
          
          {/* Restart Button */}
          <Button
            value="Play Again"
            fontSize={24}
            variant="primary"
            uiTransform={{
              width: 200,
              height: 50,
              margin: { top: 20 }
            }}
            onMouseDown={() => {
              restartGame()
            }}
          />
        </UiEntity>
      </UiEntity>
    )
  }

  // No UI for idle state
  return null
}
