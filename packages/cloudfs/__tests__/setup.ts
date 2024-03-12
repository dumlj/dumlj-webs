import fs from 'fs'
import os from 'os'
import path from 'path'
import puppeteer from 'puppeteer'

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

export default async function () {
  const browser = await puppeteer.launch()
  // store the browser instance so we can teardown it later
  // this global is only available in the teardown but not in TestEnvironments
  globalThis.__BROWSER_GLOBAL__ = browser

  // use the file system to expose the wsEndpoint for TestEnvironments
  await fs.promises.mkdir(DIR, { recursive: true })
  await fs.promises.writeFile(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint())
}
