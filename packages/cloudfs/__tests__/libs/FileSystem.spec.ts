import { FileSystem } from '@/libs/FileSystem'

describe('FileSystem', () => {
  let fs: FileSystem

  beforeEach(() => {
    fs = new FileSystem('test-database')
  })

  afterEach(() => {
    fs['db'].close()
  })

  it('should return true if the file content is different', async () => {
    const file = 'test.txt'
    const source1 = 'Hello, world!'
    const source2 = 'Hello, universe!'

    await fs.writeFile(file, source1)
    const diff1 = await fs.diff(file, source2)
    expect(diff1).toBe(true)
  })

  it('should return false if the file content is the same', async () => {
    const file = 'test.txt'
    const source = 'Hello, world!'

    await fs.writeFile(file, source)
    const diff1 = await fs.diff(file, source)
    expect(diff1).toBe(false)
  })

  it('should return true if the file does not exist', async () => {
    const file = 'not-exist.txt'
    const source = 'Hello, world!'

    const diff1 = await fs.diff(file, source)
    expect(diff1).toBe(true)
  })
})
