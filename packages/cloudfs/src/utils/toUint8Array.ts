import type { FSFileContent } from '@/types'

export async function toUint8Array(content: FSFileContent) {
  if (content instanceof Blob) {
    const buffer = await content.arrayBuffer()
    return toUint8Array(buffer)
  }

  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content)
  }

  if (content instanceof Uint8Array) {
    return content
  }

  if (typeof content === 'number') {
    return new Uint8Array([content])
  }

  if (typeof content === 'string') {
    const encoder = new TextEncoder()
    return new Uint8Array(encoder.encode(content))
  }

  return new Uint8Array()
}
