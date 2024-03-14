import { Logger } from '@/libs/Logger'
import { Messager, type Action } from '@/libs/Messager'
import {
  GOOGLE_DRIVE_ACCESS_TOKEN_LOCALSTORAGE_NAME,
  GOOGLE_DRIVE_API_URL,
  GOOGLE_DRIVE_AUTHORY_CHANGED_EVENT,
  GOOGLE_DRIVE_AUTH_EVENT,
  GOOGLE_DRIVE_CHECK_ACCESS_TOKEN_URL,
} from '@/constants'

export interface AccessToken {
  accessToken: string
  expired: number
}

export interface GoogleAuthConfig {
  clientId: string
  apiKey: string
  scope: string
}

export interface GoogleAuthoryEventDetail {
  authorized: boolean
}

export class GoogleAuth {
  protected apiKey: string
  protected tokenClient: google.accounts.oauth2.TokenClient
  protected messager = new Messager({ speaker: window })
  protected logger = new Logger('GoogleAuth')

  protected get accessToken() {
    const token = this.loadAccessToken()
    if (token) {
      return token
    }

    if (typeof gapi?.auth?.getToken !== 'function') {
      return
    }

    const result = gapi.auth.getToken()
    if (!result) {
      return
    }

    const { access_token: accessToken } = result
    return accessToken
  }

  public get isAuthorized() {
    return !!this.accessToken
  }

  constructor(config: GoogleAuthConfig) {
    const { clientId, apiKey, scope } = config

    if (!apiKey) {
      throw new Error('"apiKey" is not defined.')
    }

    if (!clientId) {
      throw new Error('"clientId" is not defined.')
    }

    this.apiKey = apiKey
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scope,
      callback: ({ error, access_token: accessToken }) => {
        if (error !== undefined) {
          throw new Error(error)
        }

        const detail = { accessToken }
        this.messager.dispatchEvent(GOOGLE_DRIVE_AUTH_EVENT, detail)
      },
    })
  }

  public async open() {
    const accessToken = await this.requestAccessToken()
    await this.setAccessToken(accessToken)
  }

  public async ping() {
    if (!this.accessToken) {
      this.messager.dispatchEvent<GoogleAuthoryEventDetail>(GOOGLE_DRIVE_AUTHORY_CHANGED_EVENT, { authorized: false })
      return false
    }

    const response = await fetch(GOOGLE_DRIVE_CHECK_ACCESS_TOKEN_URL`${this.accessToken}`)
    const isAuthorized = response.status === 200
    isAuthorized === false && this.clearAccessToken()
    return isAuthorized
  }

  public onAuthChanged(action: Action<GoogleAuthoryEventDetail>) {
    return this.messager.addEventListener<GoogleAuthoryEventDetail>(GOOGLE_DRIVE_AUTHORY_CHANGED_EVENT, action)
  }

  protected async setAccessToken(accessToken: string) {
    if (gapi?.client) {
      gapi.client.setToken({ access_token: accessToken })
      this.saveAccessToken(accessToken)
      return
    }

    await this.loadGAPI('client')
    await gapi.client.load(GOOGLE_DRIVE_API_URL)
    gapi.client.setToken({ access_token: accessToken })
    await gapi.client.init({ apiKey: this.apiKey })
    this.saveAccessToken(accessToken)
  }

  protected async requestAccessToken(options?: google.accounts.oauth2.OverridableTokenClientConfig) {
    if (this.accessToken) {
      return this.accessToken
    }

    return new Promise<string>((resolve, reject) => {
      this.messager.addOnceEventListener<{ accessToken: string }>(GOOGLE_DRIVE_AUTH_EVENT, async ({ accessToken }) => {
        if (typeof accessToken === 'string') {
          resolve(accessToken)
          return
        }

        reject(new Error('Fetch access token failed.'))
      })

      // Access token expires
      this.tokenClient.requestAccessToken(options)
    })
  }

  protected loadGAPI(api: string) {
    return new Promise((resolve) => {
      gapi.load(api, resolve)
    })
  }

  protected loadAccessToken() {
    const data = localStorage.getItem(GOOGLE_DRIVE_ACCESS_TOKEN_LOCALSTORAGE_NAME)
    if (typeof data !== 'string') {
      return
    }

    const { accessToken, expired } = JSON.parse(data) as AccessToken
    if (typeof expired !== 'number') {
      return accessToken
    }

    if (new Date(expired).getTime() <= new Date().getTime()) {
      return accessToken
    }
  }

  protected saveAccessToken(accessToken: string, expired?: number) {
    const data = JSON.stringify({ accessToken, expired })
    localStorage.setItem(GOOGLE_DRIVE_ACCESS_TOKEN_LOCALSTORAGE_NAME, data)
  }

  protected clearAccessToken() {
    localStorage.removeItem(GOOGLE_DRIVE_ACCESS_TOKEN_LOCALSTORAGE_NAME)
    gapi?.client?.setToken(null)
    this.messager.dispatchEvent<GoogleAuthoryEventDetail>(GOOGLE_DRIVE_AUTHORY_CHANGED_EVENT, { authorized: false })
    this.logger.debug('Clear access token')
  }
}
