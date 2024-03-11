import { LOGGER_BANNER } from '@/constants'

/** Get the current time. */
function time() {
  const now = new Date()
  return `${now.getHours()}:${now.getMinutes()}:${now.getMinutes()}`
}

function styleTime(color = '#777777') {
  return `font-weight:bold;color:#fff;background-color:${color};`
}

function styleBanner(color: string) {
  return `font-weight:bold;color:#fff;background-color:${color};`
}

function styleMessage(color: string) {
  return `font-weight:normal;color:${color};`
}

/**
 * Log a success message.
 * @param title The title of the message.
 * @param details Any additional details to log.
 */
export function ok(title: string, ...details: any[]) {
  const content = `%c[${time()}]%c[${LOGGER_BANNER}]%c ${title}`
  const suffix = details?.length ? ['\n', ...details] : []
  // eslint-disable-next-line no-console
  console.log(content, styleTime(), styleBanner('#1cdc9a'), styleMessage('#1cdc9a'), ...suffix)
}

/**
 * Log an info message.
 * @param title The title of the message.
 * @param details Any additional details to log.
 */
export function info(title: string, ...details: any[]) {
  const conten = `%c[${time()}]%c[${LOGGER_BANNER}]%c ${title}`
  const suffix = details?.length ? ['\n', ...details] : []
  // eslint-disable-next-line no-console
  console.info(conten, styleTime(), styleBanner('#1890ff'), styleMessage('#1890ff'), ...suffix)
}

/**
 * Log a warning message.
 * @param title The title of the message.
 * @param details Any additional details to log.
 */
export function warn(title: string, ...details: any[]) {
  const content = `%c[${time()}]%c[${LOGGER_BANNER}]%c ${title}`
  const suffix = details?.length ? ['\n', ...details] : []
  // eslint-disable-next-line no-console
  console.warn(content, styleTime(), styleBanner('#fdbc4b'), styleMessage('#fdbc4b'), ...suffix)
}

/**
 * Log an error message.
 * @param title The title of the message.
 * @param details Any additional details to log.
 */
export function fail(title: string, ...details: any[]) {
  const content = `%c[${time()}]%c[${LOGGER_BANNER}]%c ${title}`
  const suffix = details?.length ? ['\n', ...details] : []
  // eslint-disable-next-line no-console
  console.error(content, styleTime(), styleBanner('#c0392b'), styleMessage('#c0392b'), ...suffix)
}

/**
 * Log a debug message.
 * @param title The title of the message.
 * @param details Any additional details to log.
 */
export function debug(title: string, ...details: any[]) {
  const content = `%c[${time()}]%c[${LOGGER_BANNER}]%c ${title}`
  const suffix = details?.length ? ['\n', ...details] : []
  // eslint-disable-next-line no-console
  console.debug(content, styleTime(), styleBanner('#777777'), styleMessage('#777777'), ...suffix)
}
