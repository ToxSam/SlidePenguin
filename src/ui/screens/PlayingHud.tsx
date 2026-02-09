import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { RoundedPanel } from '../components/RoundedPanel'

const PENGUIN_THUMB_OPEN = 'assets/scene/Images/PenguinThumbOpen.png'
const SWIPE_PANEL_BLUE = Color4.create(0.2, 0.4, 0.85, 1)

export interface PlayingHudProps {
  distanceToHome: number
  canSwipe: boolean
}

export function PlayingHud({ distanceToHome, canSwipe }: PlayingHudProps) {
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
      {/* Distance: no background, just text */}
      <UiEntity
        uiTransform={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: { top: 20 }
        }}
      >
        <Label
          value={distanceText}
          fontSize={32}
          color={Color4.White()}
          textAlign="middle-center"
        />
      </UiEntity>

      {canSwipe && (
        <UiEntity
          uiTransform={{
            positionType: 'relative',
            margin: { bottom: 64 },
            alignSelf: 'center'
          }}
        >
          <RoundedPanel
            innerColor={SWIPE_PANEL_BLUE}
            width={340}
            innerMinHeight={56}
            outerPadding={6}
            innerPadding={{ top: 8, bottom: 8, left: 20, right: 20 }}
          >
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Label
                value="Press E to Swipe!"
                fontSize={24}
                color={Color4.White()}
                textAlign="middle-center"
                textWrap="nowrap"
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            </UiEntity>
          </RoundedPanel>
          <UiEntity
            uiTransform={{
              width: 192,
              height: 192,
              positionType: 'absolute',
              position: { left: -130, bottom: -8 },
              padding: 4,
              borderRadius: 12
            }}
            uiBackground={{
              color: Color4.create(0, 0, 0, 0)
            }}
          >
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                borderRadius: 8
              }}
              uiBackground={{
                texture: { src: PENGUIN_THUMB_OPEN },
                textureMode: 'stretch'
              }}
            />
          </UiEntity>
        </UiEntity>
      )}
    </UiEntity>
  )
}
