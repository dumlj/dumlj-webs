import { SyncService } from '@dumlj/cloudfs/src'

customElements.define(
  'google-drive-sync',
  class GoogleDriveSync extends HTMLElement {
    protected googleSyncService = new SyncService({
      database: 'cloudfs',
      googleClientId: import.meta.env.VITE_CLIENT_ID,
      googleApiKey: import.meta.env.VITE_API_KEY,
    })

    public async connectedCallback() {
      this.googleSyncService.onAuthChanged(({ authorized }) => {
        this.innerText = `SYNC (${authorized ? 'Authorized' : 'Unauthorized'})`
      })

      this.addEventListener('click', async () => {
        await this.googleSyncService.sync()
      })
    }
  }
)
