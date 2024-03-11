import { debug } from '@/services/pretty'
import { GOOGLE_DRIVE_ACCESS_TOKEN_LOCALSTORAGE_NAME, GOOGLE_DRIVE_API_URL, GOOGLE_DRIVE_AUTH_EVENT } from '@/constants'
import { Messager } from './Messager'

export interface AccessToken {
  accessToken: string
  expired: number
}

export interface GoogleAuthConfig {
  clientId: string
  apiKey: string
  scope: string
}

export class GoogleAuth {
  protected apiKey: string
  protected tokenClient: google.accounts.oauth2.TokenClient
  protected messager = new Messager({ speaker: window })

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
    if (gapi?.client) {
      gapi.client.setToken({ access_token: accessToken })
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
    gapi.client.setToken(null)
    debug('Clear access token')
  }

  // public async refreshToken() {
  //   const response = await fetch('http://localhost:3000/api/oauth', { method: 'GET' })
  //   const { url } = await response.json()
  //   const opener = window.open(url, 'cloudfs', 'width=600,height=600,toolbar=no,location=no')

  //   interface Payload {
  //     type: string
  //     data: {
  //       access_token: string
  //       expires_in: number
  //     }
  //   }

  //   const handleBeforeunload = () => {
  //     opener?.close()
  //   }

  //   const handleMessage = (event: MessageEvent<Payload>) => {
  //     if (event.source === opener) {
  //       const { access_token: accessToken, expires_in: expired } = event.data?.data
  //       console.log({ event, accessToken, expired })
  //       saveAccessToken(accessToken, expired)

  //       window.removeEventListener('unload', handleBeforeunload)
  //       window.removeEventListener('message', handleMessage)
  //     }
  //   }

  //   window.addEventListener('unload', handleBeforeunload)
  //   window.addEventListener('message', handleMessage)
  // }
}
