export type MountOrientation = 'portrait' | 'landscape'

/** 保存時に適用する時計回りの回転角度 */
export type CaptureRotationDeg = 0 | 90 | 180 | 270

/** 手持ち横向きは、スマホを左に90度傾けている前提（縦向きから反時計回り） */
export const LANDSCAPE_LEFT_TILT_SCREEN_ANGLE = 270

export function readScreenAngle(): number {
  if (typeof screen !== 'undefined' && screen.orientation?.angle != null) {
    return screen.orientation.angle
  }
  if (typeof window !== 'undefined' && typeof window.orientation === 'number') {
    return window.orientation
  }
  return 0
}

export function detectHandheldMount(
  screenAngle: number,
  viewportIsLandscape: boolean
): MountOrientation {
  const normalized = ((screenAngle % 360) + 360) % 360
  if (normalized === 90 || normalized === 270) return 'landscape'
  return viewportIsLandscape ? 'landscape' : 'portrait'
}

/** |gamma|がこの値（度）を超えたら端末が横向きに寝ていると判定する */
const LANDSCAPE_GAMMA_DEG = 45

/**
 * DeviceOrientationによる物理的な傾き判定（画面回転ロックの影響を受けない）。
 * 読み取り値がない、または端末がほぼ水平な場合はnullを返す。
 */
export function mountFromDeviceTilt(
  gamma: number | null | undefined,
  beta?: number | null
): MountOrientation | null {
  if (gamma == null || Number.isNaN(gamma)) return null
  if (
    beta != null &&
    beta !== 0 &&
    !Number.isNaN(beta) &&
    Math.abs(beta) < 20 &&
    Math.abs(gamma) < 20
  ) {
    return null
  }
  return Math.abs(gamma) >= LANDSCAPE_GAMMA_DEG ? 'landscape' : 'portrait'
}

export function resolveHandheldMount(input: {
  screenAngle: number
  viewportIsLandscape: boolean
  screenOrientationType?: string
  deviceTiltMount?: MountOrientation | null
}): MountOrientation {
  if (input.deviceTiltMount) return input.deviceTiltMount
  return input.viewportIsLandscape ? 'landscape' : 'portrait'
}

const LANDSCAPE_CONFIRM_READINGS = 2

/** portraitは即座に反映。landscapeは初回の不安定な読み取りを無視するため連続確認が必要 */
export function applyTiltReading(
  reading: MountOrientation | null,
  landscapeStreak: number,
  current: MountOrientation | null
): { tilt: MountOrientation | null; landscapeStreak: number } {
  if (reading === 'portrait') {
    return { tilt: 'portrait', landscapeStreak: 0 }
  }
  if (reading === 'landscape') {
    const nextStreak = landscapeStreak + 1
    if (nextStreak >= LANDSCAPE_CONFIRM_READINGS) {
      return { tilt: 'landscape', landscapeStreak: nextStreak }
    }
    return { tilt: current, landscapeStreak: nextStreak }
  }
  return { tilt: current, landscapeStreak }
}

/**
 * 保存後のピクセルが物理的な向きと一致するよう時計回りに回転する角度を計算する。
 * 横向きマウントは、右手持ちを想定してスマホを左に傾けている前提
 * （縦向きから反時計回り）とし、カメラストリームがまだ縦長のときは
 * 時計回り270度で焼き込む。angle === 90 は端末が右に傾いていることを
 * 示すため、その場合は90度を使う。
 */
export function computeCaptureRotationDeg(
  mount: MountOrientation,
  videoWidth: number,
  videoHeight: number,
  screenAngle: number,
  invertDirection = false
): CaptureRotationDeg {
  if (!videoWidth || !videoHeight) return 0

  const streamIsLandscape = videoWidth > videoHeight
  const wantLandscape = mount === 'landscape'
  const normalizedAngle = ((screenAngle % 360) + 360) % 360

  let rotation: CaptureRotationDeg = 0

  if (wantLandscape) {
    if (streamIsLandscape) {
      rotation = 0
    } else {
      rotation = normalizedAngle === 90 ? 90 : 270
    }
  } else if (streamIsLandscape) {
    rotation = normalizedAngle === 90 ? 270 : 90
  }

  if (invertDirection && rotation !== 0) {
    rotation = ((360 - rotation) % 360) as CaptureRotationDeg
  }

  return rotation
}

export function captureFrameFromVideo(
  video: HTMLVideoElement,
  mount: MountOrientation,
  invertDirection = false,
  screenAngle = readScreenAngle()
): HTMLCanvasElement {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  const rotation = computeCaptureRotationDeg(
    mount,
    videoWidth,
    videoHeight,
    screenAngle,
    invertDirection
  )

  const swap = rotation === 90 || rotation === 270
  const canvasWidth = swap ? videoHeight : videoWidth
  const canvasHeight = swap ? videoWidth : videoHeight

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('キャンバスを初期化できませんでした')

  ctx.translate(canvasWidth / 2, canvasHeight / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(video, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight)

  return canvas
}

/** 手持ち撮影のシャッター: 横向きは常に左90度のスマホ傾きとして焼き込む */
export function captureHandheldFrame(
  video: HTMLVideoElement,
  deviceTiltMount?: MountOrientation | null
): HTMLCanvasElement {
  const viewportIsLandscape =
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  const rawAngle = readScreenAngle()
  const screenOrientationType =
    typeof screen !== 'undefined' ? (screen.orientation?.type ?? '') : ''
  const mount = resolveHandheldMount({
    screenAngle: rawAngle,
    viewportIsLandscape,
    screenOrientationType,
    deviceTiltMount,
  })
  const screenAngle = mount === 'landscape' ? LANDSCAPE_LEFT_TILT_SCREEN_ANGLE : rawAngle
  return captureFrameFromVideo(video, mount, false, screenAngle)
}

/** プレビュー枠は常に縦長。マウント向きは保存時の回転にのみ影響する */
export function previewAspectClass(_mount?: MountOrientation): string {
  return 'aspect-[3/4]'
}
