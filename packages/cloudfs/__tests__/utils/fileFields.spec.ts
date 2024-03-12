import { stringifyFileField } from '@/utils/fileFields'
import type { GDFileFieldKey } from '@/types'

describe('stringifyFileField', () => {
  it('should stringify an array of file field keys', () => {
    const fileFields: GDFileFieldKey[] = ['name', 'id', 'kind']
    const expectedString = 'files(name, id, kind)'
    const stringifiedFileField = stringifyFileField(fileFields)
    expect(stringifiedFileField).toBe(expectedString)
  })
})
