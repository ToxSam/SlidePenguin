import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'

const SIZE = 360
const IMAGES = ['Count0.png', 'Count1.png', 'Count2.png', 'Count3.png'] as const

export interface CountdownOverlayProps {
  countdownValue: number
  shakeX: number
  shakeY: number
}

export function CountdownOverlay({ countdownValue, shakeX, shakeY }: CountdownOverlayProps) {
  const countImage = IMAGES[Math.max(0, Math.min(countdownValue, 3))]
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
          width: SIZE,
          height: SIZE,
          margin: { left: shakeX, top: shakeY }
        }}
        uiBackground={{
          texture: { src: `assets/scene/Images/${countImage}` },
          textureMode: 'stretch'
        }}
      />
    </UiEntity>
  )
}
