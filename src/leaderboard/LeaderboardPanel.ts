import { engine, Entity, Transform, TransformTypeWithOptionals, TextShape, TextAlignMode } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'

export type LeaderboardPanelEntry = {
  name: string
  score: string
}

export type LeaderboardPanelOptions = {
  parent?: Entity
  transform?: TransformTypeWithOptionals
  size?: Vector3
  headerText?: string
}

type PanelState = {
  root: Entity
  rows: Entity[]
}

const DEFAULT_SIZE = Vector3.create(4, 6.0, 1)
const DEFAULT_ROWS = 10

export function createLeaderboardPanel(options: LeaderboardPanelOptions = {}) {
  const size = options.size ?? DEFAULT_SIZE

  const root = engine.addEntity()
  if (options.parent) {
    Transform.createOrReplace(root, {
      parent: options.parent,
      position: options.transform?.position ?? Vector3.Zero(),
      rotation: options.transform?.rotation ?? Quaternion.Identity(),
      scale: options.transform?.scale ?? Vector3.One()
    })
  } else {
    Transform.createOrReplace(root, options.transform ?? {})
  }

  const white = Color4.White()

  const titleEntity = engine.addEntity()
  Transform.createOrReplace(titleEntity, {
    parent: root,
    position: Vector3.create(0, size.y / 2 - 0.55, -0.01),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  TextShape.createOrReplace(titleEntity, {
    text: 'LEADERBOARD',
    fontSize: 2.2,
    textColor: white,
    outlineColor: Color4.Black(),
    outlineWidth: 0.1,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER
  })

  const headerRow = engine.addEntity()
  Transform.createOrReplace(headerRow, {
    parent: root,
    position: Vector3.create(0, size.y / 2 - 1.25, -0.01),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  const headerName = engine.addEntity()
  Transform.createOrReplace(headerName, {
    parent: headerRow,
    position: Vector3.create(-1.2, 0, 0),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  TextShape.createOrReplace(headerName, {
    text: 'PLAYER',
    fontSize: 1.35,
    textColor: white,
    outlineColor: Color4.Black(),
    outlineWidth: 0.1,
    textAlign: TextAlignMode.TAM_MIDDLE_LEFT
  })

  const headerScore = engine.addEntity()
  Transform.createOrReplace(headerScore, {
    parent: headerRow,
    position: Vector3.create(1.25, 0, 0),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  TextShape.createOrReplace(headerScore, {
    text: 'POINTS',
    fontSize: 1.35,
    textColor: white,
    outlineColor: Color4.Black(),
    outlineWidth: 0.1,
    textAlign: TextAlignMode.TAM_MIDDLE_RIGHT
  })

  const rows: Entity[] = []
  const contentTop = size.y / 2 - 1.7
  const contentBottom = -size.y / 2 + 0.9
  const rowGap = (contentTop - contentBottom) / (DEFAULT_ROWS - 1)
  for (let r = 0; r < DEFAULT_ROWS; r++) {
    const rowRoot = engine.addEntity()
    Transform.createOrReplace(rowRoot, {
      parent: root,
      position: Vector3.create(0, contentTop - r * rowGap, -0.01),
      rotation: Quaternion.Identity(),
      scale: Vector3.One()
    })

    const rankText = engine.addEntity()
    Transform.createOrReplace(rankText, {
      parent: rowRoot,
      position: Vector3.create(-1.75, 0, 0),
      rotation: Quaternion.Identity(),
      scale: Vector3.One()
    })
    TextShape.createOrReplace(rankText, {
      text: `${r + 1}.`,
      fontSize: 1.2,
      textColor: white,
      outlineColor: Color4.Black(),
      outlineWidth: 0.1,
      textAlign: TextAlignMode.TAM_MIDDLE_LEFT
    })

    const nameText = engine.addEntity()
    Transform.createOrReplace(nameText, {
      parent: rowRoot,
      position: Vector3.create(-1.2, 0, 0),
      rotation: Quaternion.Identity(),
      scale: Vector3.One()
    })
    TextShape.createOrReplace(nameText, {
      text: '---',
      fontSize: 1.5,
      textColor: white,
      outlineColor: Color4.Black(),
      outlineWidth: 0.1,
      textAlign: TextAlignMode.TAM_MIDDLE_LEFT
    })

    const scoreText = engine.addEntity()
    Transform.createOrReplace(scoreText, {
      parent: rowRoot,
      position: Vector3.create(1.25, 0, 0),
      rotation: Quaternion.Identity(),
      scale: Vector3.One()
    })
    TextShape.createOrReplace(scoreText, {
      text: '--',
      fontSize: 1.5,
      textColor: white,
      outlineColor: Color4.Black(),
      outlineWidth: 0.1,
      textAlign: TextAlignMode.TAM_MIDDLE_RIGHT
    })

    rows.push(nameText)
    rows.push(scoreText)
  }

  // Optional next/prev buttons could be added later if needed

  const state: PanelState = {
    root,
    rows
  }

  return state
}

export function setPanelData(panel: PanelState, entries: LeaderboardPanelEntry[]) {
  const rowEntities = panel.rows
  if (!rowEntities) return

  if (entries.length === 0) {
    for (let i = 0; i < DEFAULT_ROWS; i++) {
      const nameEntity = rowEntities[i * 2]
      const scoreEntity = rowEntities[i * 2 + 1]
      TextShape.getMutable(nameEntity).text = i === 0 ? 'No data' : ''
      TextShape.getMutable(scoreEntity).text = ''
    }
    return
  }

  for (let i = 0; i < DEFAULT_ROWS; i++) {
    const entry = entries[i]
    const nameEntity = rowEntities[i * 2]
    const scoreEntity = rowEntities[i * 2 + 1]
    TextShape.getMutable(nameEntity).text = entry ? entry.name : '---'
    TextShape.getMutable(scoreEntity).text = entry ? entry.score : '--'
  }
}
