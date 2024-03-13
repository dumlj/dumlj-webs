import { guid } from '@/utils/guid'

describe('guid', () => {
  it('should generate a unique identifier', () => {
    const guid1 = guid()
    const guid2 = guid()
    expect(guid1).not.toBe(guid2)
  })
})
