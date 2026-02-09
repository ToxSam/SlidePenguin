import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { RoundedPanel } from '../components/RoundedPanel'
import { FrostyButton } from '../components/FrostyButton'
import { restartGame } from '../../systems'

export interface EndedPanelProps {
  score: number
  distanceToHome: number
  hasLost: boolean
}

// Type scale with reserved row height so lines never overlap
const FONT_HEADLINE = 42
const FONT_SUBTITLE = 24
const FONT_POINTS_LABEL = 22
const FONT_HERO = 64
const FONT_CLOSING = 24

const ROW_HEADLINE = 52
const ROW_SUBTITLE = 36
const ROW_POINTS = 120
const ROW_CLOSING = 36

const WHITE = Color4.White()
const MUTED = Color4.create(1, 1, 1, 0.78)
const HERO_GOLD = Color4.create(1, 0.88, 0.35, 1)

export function EndedPanel({ score, distanceToHome, hasLost }: EndedPanelProps) {
  const distanceStr = distanceToHome.toFixed(1).replace('.', ',')
  const innerColor = hasLost
    ? Color4.create(0.55, 0.25, 0.3, 1)
    : Color4.create(0.2, 0.4, 0.85, 1)
  const distanceLine = hasLost ? "You didn't reach home" : `${distanceStr} m from home`

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
      <RoundedPanel innerColor={innerColor} width={820} minHeight={560}>
        <UiEntity
          uiTransform={{
            width: '100%',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: { left: 32, right: 32 }
          }}
        >
          {/* GOOD TRY! — fixed height row so no overlap */}
          <UiEntity uiTransform={{ width: '100%', height: ROW_HEADLINE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Label value="GOOD TRY!" fontSize={FONT_HEADLINE} color={WHITE} textAlign="middle-center" uiTransform={{ width: '100%', display: 'flex' }} />
          </UiEntity>

          {/* Subtitle — quieter context (distance or “didn’t reach home”) */}
          <UiEntity uiTransform={{ width: '100%', height: ROW_SUBTITLE, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: { top: 16 } }}>
            <Label value={distanceLine} fontSize={FONT_SUBTITLE} color={MUTED} textAlign="middle-center" uiTransform={{ width: '100%', display: 'flex' }} />
          </UiEntity>

          {/* POINTS — hero number in its own row, then label below with clear gap */}
          <UiEntity
            uiTransform={{
              width: '100%',
              minHeight: ROW_POINTS,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: { top: 24 },
              padding: { top: 24, bottom: 24, left: 32, right: 32 },
              borderRadius: 16
            }}
            uiBackground={{
              color: Color4.create(1, 1, 1, 0.18)
            }}
          >
            <UiEntity uiTransform={{ width: '100%', height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Label value={String(score)} fontSize={FONT_HERO} color={HERO_GOLD} textAlign="middle-center" uiTransform={{ width: '100%', display: 'flex' }} />
            </UiEntity>
            <Label value="POINTS" fontSize={FONT_POINTS_LABEL} color={WHITE} textAlign="middle-center" uiTransform={{ width: '100%', display: 'flex', margin: { top: 12 } }} />
          </UiEntity>

          {/* Good luck next time! — reserved row */}
          <UiEntity uiTransform={{ width: '100%', height: ROW_CLOSING, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: { top: 28 } }}>
            <Label value="Good luck next time!" fontSize={FONT_CLOSING} color={MUTED} textAlign="middle-center" uiTransform={{ width: '100%', display: 'flex' }} />
          </UiEntity>
        </UiEntity>
        {/* Button: generous space above */}
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            width: '100%',
            justifyContent: 'center',
            margin: { top: 44 }
          }}
        >
          <FrostyButton label="Play Again" variant="primary" onPress={restartGame} />
        </UiEntity>
      </RoundedPanel>
    </UiEntity>
  )
}
