export function joinPath(...paths: string[]) {
  const slashed = paths.map((path) => path.replace(/(^(\/+)|(\/+)$)/g, ''))
  return `/${slashed.filter(Boolean).join('/')}`
}
