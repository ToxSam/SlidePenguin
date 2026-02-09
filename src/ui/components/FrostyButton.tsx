import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

const BUTTON_WIDTH = 240
const BUTTON_HEIGHT = 88
const BORDER_RADIUS = 44
const INNER_RADIUS = 42

const PRIMARY = {
  outer: Color4.create(0.85, 0.95, 1, 1),
  inner: Color4.create(0.7, 0.9, 0.98, 1),
  text: Color4.create(0.2, 0.4, 0.55, 1)
}

const SECONDARY = {
  outer: Color4.create(0.82, 0.88, 0.92, 1),
  inner: Color4.create(0.62, 0.72, 0.82, 0.7),
  text: Color4.create(0.35, 0.45, 0.55, 1)
}

export type FrostyButtonVariant = 'primary' | 'secondary'

export interface FrostyButtonProps {
  label: string
  onPress: () => void
  variant?: FrostyButtonVariant
  marginRight?: number
}

export function FrostyButton({
  label,
  onPress,
  variant = 'primary',
  marginRight
}: FrostyButtonProps) {
  const colors = variant === 'primary' ? PRIMARY : SECONDARY
  return (
    <UiEntity
      uiTransform={{
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        padding: 2,
        borderRadius: BORDER_RADIUS,
        ...(marginRight !== undefined && { margin: { right: marginRight } })
      }}
      uiBackground={{
        color: colors.outer
      }}
      onMouseDown={onPress}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: INNER_RADIUS
        }}
        uiBackground={{
          color: colors.inner
        }}
      >
        <Label
          value={label}
          fontSize={40}
          color={colors.text}
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
    </UiEntity>
  )
}
