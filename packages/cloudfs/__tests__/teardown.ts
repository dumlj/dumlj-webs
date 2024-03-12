import fs from 'fs'
import os from 'os'
import path from 'path'

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

export default async function () {
  // close the browser instance
  await globalThis.__BROWSER_GLOBAL__.close()

  // clean-up the wsEndpoint file
  await fs.promises.rm(DIR, { recursive: true, force: true })
}
