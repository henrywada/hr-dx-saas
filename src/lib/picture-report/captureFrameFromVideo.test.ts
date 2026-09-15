import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mountFromDeviceTilt,
  applyTiltReading,
  computeCaptureRotationDeg,
} from './captureFrameFromVideo'

test('gammaが45度以上なら横向きと判定される', () => {
  assert.equal(mountFromDeviceTilt(50, 0), 'landscape')
})

test('gammaが45度未満なら縦向きと判定される', () => {
  assert.equal(mountFromDeviceTilt(10, 0), 'portrait')
})

test('gammaがnullなら判定不能でnullを返す', () => {
  assert.equal(mountFromDeviceTilt(null, 0), null)
})

test('betaもgammaも小さい（端末が水平に近い）場合はnullを返す', () => {
  assert.equal(mountFromDeviceTilt(10, 10), null)
})

test('portraitの読み取りは即座に反映される', () => {
  const result = applyTiltReading('portrait', 0, 'landscape')
  assert.deepEqual(result, { tilt: 'portrait', landscapeStreak: 0 })
})

test('landscapeは連続2回読み取るまで確定しない', () => {
  const first = applyTiltReading('landscape', 0, null)
  assert.deepEqual(first, { tilt: null, landscapeStreak: 1 })
  const second = applyTiltReading('landscape', first.landscapeStreak, first.tilt)
  assert.deepEqual(second, { tilt: 'landscape', landscapeStreak: 2 })
})

test('横向き・横長ストリームでは回転不要', () => {
  assert.equal(computeCaptureRotationDeg('landscape', 1920, 1080, 0), 0)
})

test('横向き・縦長ストリーム・画面角度0では270度回転する', () => {
  assert.equal(computeCaptureRotationDeg('landscape', 1080, 1920, 0), 270)
})

test('縦横比・画面幅が0の場合は回転0を返す', () => {
  assert.equal(computeCaptureRotationDeg('portrait', 0, 0, 0), 0)
})
