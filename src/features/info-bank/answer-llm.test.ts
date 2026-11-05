import assert from 'node:assert/strict'
import test from 'node:test'

import { requestAnswer, type AnswerClient } from './answer-llm'

interface Captured {
  model?: string
  contents?: string
  config?: Record<string, unknown>
}

function fakeClient(text: string | undefined, captured: Captured): AnswerClient {
  return {
    models: {
      generateContent: async args => {
        captured.model = args.model
        captured.contents = args.contents
        captured.config = args.config
        return { text }
      },
    },
  }
}

test('外部検索につながるツールを渡さない（資料だけを根拠にする）', async () => {
  const captured: Captured = {}
  await requestAnswer(fakeClient('{}', captured), { system: 's', prompt: 'p' })
  assert.ok(captured.config)
  assert.equal('tools' in captured.config!, false)
  assert.equal('toolConfig' in captured.config!, false)
})

test('thinking を無効にし、JSON スキーマで出力させる', async () => {
  const captured: Captured = {}
  await requestAnswer(fakeClient('{}', captured), { system: 's', prompt: 'p' })
  assert.deepEqual(captured.config?.thinkingConfig, { thinkingBudget: 0 })
  assert.equal(captured.config?.responseMimeType, 'application/json')
  assert.ok(captured.config?.responseJsonSchema)
  assert.equal(captured.config?.temperature, 0)
  assert.equal(captured.config?.systemInstruction, 's')
  assert.equal(captured.contents, 'p')
})

test('モデルの応答テキストをそのまま返す', async () => {
  const r = await requestAnswer(fakeClient('{"answerable":false}', {}), {
    system: 's',
    prompt: 'p',
  })
  assert.equal(r, '{"answerable":false}')
})

test('応答が空ならエラーにする', async () => {
  await assert.rejects(
    () => requestAnswer(fakeClient(undefined, {}), { system: 's', prompt: 'p' }),
    /空/
  )
})
