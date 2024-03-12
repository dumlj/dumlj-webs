import type { GDFileFieldKey } from '@/types'

export const stringifyFileField = (fileFields: GDFileFieldKey[]) => {
  return `files(${fileFields.join(', ')})`
}
