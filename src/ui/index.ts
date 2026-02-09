import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { RootUi } from './RootUi'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(RootUi)
}
