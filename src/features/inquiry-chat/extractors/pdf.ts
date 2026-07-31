import type { Buffer } from 'node:buffer'

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Node.js には DOMMatrix が存在しないため、pdf-parse/worker の CanvasFactory を
  // 明示的に渡す必要がある（渡さないと "DOMMatrix is not defined" になる）
  const { CanvasFactory } = await import('pdf-parse/worker')
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    CanvasFactory,
  })
  try {
    const result = await parser.getText()
    return (result.text || '').trim()
  } finally {
    await parser.destroy()
  }
}
