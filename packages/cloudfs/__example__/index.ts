import { SyncService } from '@dumlj/cloudfs/src'

customElements.define('google-drive-sync', class GoogleDriveSync extends HTMLElement {
  protected sync = new SyncService({
    googleClientId: import.meta.env.VITE_CLIENT_ID,
    googleApiKey: import.meta.env.VITE_API_KEY,
  })

  public async connectedCallback() {
    this.addEventListener('click', async () => {
      await this.sync.sync()
    })
  }
})
