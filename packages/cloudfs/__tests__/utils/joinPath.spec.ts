import { joinPath } from '@/utils/joinPath'

describe('joinPath', () => {
  it('should join multiple paths with a forward slash', () => {
    const path1 = 'path1'
    const path2 = 'path2'
    const path3 = 'path3'

    const joinedPath = joinPath(path1, path2, path3)

    expect(joinedPath).toBe('/path1/path2/path3')
  })

  it('should remove leading and trailing slashes from the paths', () => {
    const path1 = '/path1'
    const path2 = 'path2/'
    const path3 = '/path3/'

    const joinedPath = joinPath(path1, path2, path3)

    expect(joinedPath).toBe('/path1/path2/path3')
  })

  it('should handle empty paths', () => {
    const path1 = ''
    const path2 = 'path2'
    const path3 = ''
    const joinedPath = joinPath(path1, path2, path3)

    expect(joinedPath).toBe('/path2')
  })
})
