import { guid } from '@/utils/guid'

describe('guid', () => {
  it('should generate a unique identifier', () => {
    const guid1 = guid()
    const guid2 = guid()
    expect(guid1).not.toBe(guid2)
  })

  it('should generate a string of length 10', () => {
    const guid1 = guid()
    expect(guid1).toHaveLength(10)
  })
})
