import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

const PANEL_WIDTH = 664
const PANEL_MIN_HEIGHT = 328
const OUTER_BORDER_RADIUS = 48
const INNER_BORDER_RADIUS = 36
const OUTER_PADDING = 12
const INNER_PADDING = { top: 56, bottom: 32, left: 40, right: 40 }

export interface RoundedPanelProps {
  innerColor: Color4
  /** Optional width (default 664) */
  width?: number
  /** Optional min height (e.g. 328 or larger for ended panel) */
  minHeight?: number
  /** Optional override for inner content min height (e.g. for compact swipe hint panel) */
  innerMinHeight?: number
  /** Optional border thickness (default 12). Use 6 for 50% thinner. */
  outerPadding?: number
  /** Optional inner padding override (e.g. { top: 12, bottom: 12 } for balanced vertical space) */
  innerPadding?: { top?: number; bottom?: number; left?: number; right?: number }
  children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[]
}

export function RoundedPanel({
  innerColor,
  width = PANEL_WIDTH,
  minHeight = PANEL_MIN_HEIGHT,
  innerMinHeight: innerMinHeightOverride,
  outerPadding = OUTER_PADDING,
  innerPadding: innerPaddingOverride,
  children
}: RoundedPanelProps) {
  const innerMinHeight = innerMinHeightOverride ?? Math.max(200, minHeight - outerPadding * 2 - 24)
  const padding = innerPaddingOverride
    ? { ...INNER_PADDING, ...innerPaddingOverride }
    : INNER_PADDING
  const innerJustify = innerPaddingOverride ? 'center' : 'space-between'
  const isCompact = !!innerPaddingOverride
  const outerHeight = isCompact ? innerMinHeight + outerPadding * 2 : undefined
  return (
    <UiEntity
      uiTransform={{
        width,
        ...(outerHeight != null ? { height: outerHeight } : { minHeight }),
        borderRadius: OUTER_BORDER_RADIUS,
        padding: outerPadding,
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start'
      }}
      uiBackground={{
        color: Color4.White()
      }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: isCompact ? '100%' : undefined,
          flex: isCompact ? undefined : 1,
          minHeight: innerMinHeight,
          flexDirection: 'column',
          padding,
          alignItems: 'center',
          justifyContent: innerJustify,
          borderRadius: INNER_BORDER_RADIUS
        }}
        uiBackground={{
          color: innerColor
        }}
      >
        {children}
      </UiEntity>
    </UiEntity>
  )
}
