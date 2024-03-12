export interface Progress {
  loaded: number
  process: number
  total: number
}

export async function withProgress(response: Response, onProgress: (progress: Progress) => void) {
  if (!response.body) {
    return
  }

  const reader = response.body.getReader()
  const contentLength = response.headers.get('Content-Length')
  const totalLength = contentLength ? parseInt(contentLength, 10) : NaN
  const chunks: Uint8Array[] = []

  let loadedSize = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    chunks.push(value)

    loadedSize += value.length
    if (typeof onProgress === 'function') {
      const process = totalLength ? loadedSize / totalLength : 0
      onProgress({ loaded: loadedSize, process, total: totalLength })
    }
  }

  if (totalLength) {
    const concated = new Uint8Array(totalLength)

    let position = 0
    for (const chunk of chunks) {
      concated.set(chunk, position)
      position += chunk.length
    }

    return concated
  }

  const finalTotalLength = chunks.reduce((prev, curr) => prev + curr.length, 0)
  const finalConcated = new Uint8Array(finalTotalLength)

  let position = 0
  for (const chunk of chunks) {
    finalConcated.set(chunk, position)
    position += chunk.length
  }

  return finalConcated
}
