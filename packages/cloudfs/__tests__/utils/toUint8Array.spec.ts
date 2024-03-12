import { toUint8Array } from '@/utils/toUint8Array'

describe('toUint8Array', () => {
  it('should convert a Blob to a Uint8Array', async () => {
    const blob = new Blob(['Hello, world!'])
    const uint8Array = await toUint8Array(blob)

    expect(uint8Array).toBeInstanceOf(Uint8Array)
    expect(uint8Array.byteLength).toBe(13)
  })

  it('should convert an ArrayBuffer to a Uint8Array', async () => {
    const arrayBuffer = new ArrayBuffer(10)
    const uint8Array = await toUint8Array(arrayBuffer)

    expect(uint8Array).toBeInstanceOf(Uint8Array)
    expect(uint8Array.byteLength).toBe(10)
  })

  it('should convert a Uint8Array to itself', async () => {
    const uint8Array = new Uint8Array([1, 2, 3])
    const convertedUint8Array = await toUint8Array(uint8Array)
    expect(convertedUint8Array).toBe(uint8Array)
  })

  it('should convert a number to a Uint8Array with a single element', async () => {
    const number = 42
    const uint8Array = await toUint8Array(number)

    expect(uint8Array).toBeInstanceOf(Uint8Array)
    expect(uint8Array.byteLength).toBe(1)
    expect(uint8Array[0]).toBe(42)
  })

  it('should convert a string to a Uint8Array using a TextEncoder', async () => {
    const string = 'Hello, world!'
    const uint8Array = await toUint8Array(string)

    expect(uint8Array).toBeInstanceOf(Uint8Array)
    expect(uint8Array.byteLength).toBe(13)
    expect(String.fromCharCode(...uint8Array)).toBe(string)
  })

  it('should return an empty Uint8Array if the input is not a supported type', async () => {
    const object = {}
    const uint8Array = await toUint8Array(object as any)

    expect(uint8Array).toBeInstanceOf(Uint8Array)
    expect(uint8Array.byteLength).toBe(0)
  })
})
