import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { RoundedPanel } from '../components/RoundedPanel'
import { FrostyButton } from '../components/FrostyButton'
import { closePenguinFriendDialog, startGameFromDialog } from '../../systems'

const PENGUIN_THUMB = 'assets/scene/Images/PenguinThumbClosed.png'

export function FriendDialog() {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        positionType: 'absolute'
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'relative',
          margin: { bottom: 64 }
        }}
      >
        <RoundedPanel innerColor={Color4.create(0.2, 0.4, 0.85, 1)}>
          <Label
            value={'Hey What supp\nWanna play a game?'}
            fontSize={44}
            color={Color4.White()}
            textAlign="middle-center"
            uiTransform={{
              width: '100%',
              display: 'flex'
            }}
          />
          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              width: '100%',
              justifyContent: 'center',
              margin: { top: 48 }
            }}
          >
            <FrostyButton
              label="Yes"
              variant="primary"
              marginRight={24}
              onPress={startGameFromDialog}
            />
            <FrostyButton
              label="No"
              variant="secondary"
              onPress={closePenguinFriendDialog}
            />
          </UiEntity>
        </RoundedPanel>
        <UiEntity
          uiTransform={{
            width: 384,
            height: 384,
            positionType: 'absolute',
            position: { left: -260, bottom: 50 },
            padding: 8,
            borderRadius: 24
          }}
          uiBackground={{
            color: Color4.create(0, 0, 0, 0)
          }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              borderRadius: 16
            }}
            uiBackground={{
              texture: { src: PENGUIN_THUMB },
              textureMode: 'stretch'
            }}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
