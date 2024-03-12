import { withProgress, type Progress } from '@/utils/withProgress'

describe('withProgress', () => {
  it('should return a concatenated Uint8Array and call the onProgress callback with the progress', async () => {
    const body = 'Hello, world!'
    const response = new Response(body)
    response.headers.set('Content-Length', body.length.toString())

    const onProgress = jest.fn((progress: Progress) => {
      expect(progress.loaded).toBeGreaterThanOrEqual(0)
      expect(progress.process).toBeGreaterThanOrEqual(0)
      expect(progress.total).toBe(13)
    })

    const uint8Array = await withProgress(response, onProgress)

    expect(uint8Array).toBeInstanceOf(Uint8Array)
    expect(uint8Array!.length).toBe(13)
    expect(String.fromCharCode(...uint8Array!)).toBe('Hello, world!')
    expect(onProgress).toHaveBeenCalledTimes(1)
  })

  it('should return a concatenated Uint8Array even if the Content-Length header is not set', async () => {
    const body = 'Hello, world!'
    const response = new Response(body)

    const onProgress = jest.fn((progress: Progress) => {
      expect(progress.loaded).toBeGreaterThanOrEqual(0)
      expect(progress.process).toBeGreaterThanOrEqual(0)
      expect(progress.total).toBe(NaN)
    })

    const uint8Array = await withProgress(response, onProgress)

    expect(uint8Array).toBeInstanceOf(Uint8Array)
    expect(uint8Array!.length).toBe(13)
    expect(String.fromCharCode(...uint8Array!)).toBe('Hello, world!')
    expect(onProgress).toHaveBeenCalledTimes(1)
  })

  it('should return null if the response has no body', async () => {
    const response = new Response()
    const uint8Array = await withProgress(response, () => {})
    expect(uint8Array).toBeUndefined()
  })
})
