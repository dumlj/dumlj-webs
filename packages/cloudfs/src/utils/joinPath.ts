export function joinPath(...paths: string[]) {
  const slashed = paths.map((path) => path.replace(/(?:^(?:\/+)|(?:\/+)$)/, ''))
  return `/${slashed.join('/')}`
}
