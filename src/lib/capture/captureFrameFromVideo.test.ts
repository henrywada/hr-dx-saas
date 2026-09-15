import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyTiltReading,
  computeCaptureRotationDeg,
  detectHandheldMount,
  mountFromDeviceTilt,
  resolveHandheldMount,
} from './captureFrameFromVideo'

test('90/270度の画面角度はビューポートが縦でも横向きと判定される', () => {
  assert.equal(detectHandheldMount(90, false), 'landscape')
  assert.equal(detectHandheldMount(270, false), 'landscape')
})

test('gamma 45度以上は横向き', () => {
  assert.equal(mountFromDeviceTilt(90, 0), 'landscape')
})

test('端末傾きが画面ロックより優先される', () => {
  assert.equal(
    resolveHandheldMount({
      screenAngle: 0,
      viewportIsLandscape: false,
      screenOrientationType: 'portrait-primary',
      deviceTiltMount: 'landscape',
    }),
    'landscape'
  )
})

test('landscape は2回連続で確定する', () => {
  assert.deepEqual(applyTiltReading('landscape', 0, null), {
    tilt: null,
    landscapeStreak: 1,
  })
})

test('横向き・縦長ストリームは270度回転', () => {
  assert.equal(computeCaptureRotationDeg('landscape', 1080, 1920, 0), 270)
})
