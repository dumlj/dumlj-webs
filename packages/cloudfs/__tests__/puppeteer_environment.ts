import path from 'path'
import fs from 'fs'
import os from 'os'
import type { Browser } from 'puppeteer'
import puppeteer from 'puppeteer'
import { TestEnvironment } from 'jest-environment-jsdom'
import type { Global } from '@jest/types'

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

export default class PuppeteerEnvironment extends TestEnvironment {
  public declare global: Window &
    Global.Global & {
      __BROWSER_GLOBAL__: Browser
    }

  public async setup() {
    await super.setup()

    // get the wsEndpoint
    const wsEndpoint = await fs.promises.readFile(path.join(DIR, 'wsEndpoint'), 'utf8')
    if (!wsEndpoint) {
      throw new Error('wsEndpoint not found')
    }

    // connect to puppeteer
    this.global.__BROWSER_GLOBAL__ = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
    })

    if (typeof this.global.TextEncoder === 'undefined') {
      this.global.TextEncoder = TextEncoder
      this.global.TextDecoder = TextDecoder
    }

    if (typeof this.global.ReadableStream === 'undefined') {
      this.global.ReadableStream = ReadableStream
    }

    if (typeof this.global.Response === 'undefined') {
      this.global.Response = Response
    }

    if (typeof this.global.structuredClone === 'undefined') {
      this.global.structuredClone = (value: any) => {
        return JSON.parse(JSON.stringify(value))
      }
    }
  }

  public async teardown() {
    if (this.global.__BROWSER_GLOBAL__) {
      this.global.__BROWSER_GLOBAL__.disconnect()
    }

    await super.teardown()
  }

  public getVmContext() {
    return super.getVmContext()
  }
}
