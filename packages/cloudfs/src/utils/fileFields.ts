import type { GDFileFieldKey } from '@/types'

export function stringifyFileField(fileFields: GDFileFieldKey[]) {
  return `files(${fileFields.join(', ')})`
}
