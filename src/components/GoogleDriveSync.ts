import { SyncService } from '@/libs/SyncService'

export class GoogleDriveSync extends HTMLElement {
  protected sync: SyncService

  constructor() {
    super()

    this.sync = new SyncService({
      googleClientId: import.meta.env.VITE_CLIENT_ID,
      googleApiKey: import.meta.env.VITE_API_KEY,
    })
  }

  public async connectedCallback() {
    this.addEventListener('click', async () => {
      await this.sync.sync()
    })
  }
}
