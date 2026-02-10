import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const Messages = {
  ping: Schemas.Map({
    clientTime: Schemas.Int64
  }),
  pong: Schemas.Map({
    clientTime: Schemas.Int64,
    serverTime: Schemas.Int64
  })
}

export const room = registerMessages(Messages)
