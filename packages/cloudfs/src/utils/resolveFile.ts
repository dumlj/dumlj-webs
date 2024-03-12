import mime from 'mime'

export function resolveFile(file: string) {
  const parts = file.replace(/(^\/|\/$)/g, '').split('/')
  const basename = parts.pop()
  const dirname = `/${parts.join('/')}`
  const filepath = `/${[...parts, basename].join('/')}`
  const mimeType = mime.getType(file)
  return { basename, dirname, filepath, mimeType }
}
