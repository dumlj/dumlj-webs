export function guid() {
  return `o${(Math.floor(Math.random() * 1e13) + Date.now()).toString(35)}`
}
