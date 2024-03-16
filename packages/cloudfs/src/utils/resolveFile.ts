import { lookup } from 'mrmime'

export function resolveFile(file: string) {
  const parts = file.replace(/(^\/|\/$)/g, '').split('/')
  const basename = parts.pop()
  const dirname = `/${parts.join('/')}`
  const filepath = `/${[...parts, basename].join('/')}`
  const mimeType = lookup(file)
  return { basename, dirname, filepath, mimeType }
}
