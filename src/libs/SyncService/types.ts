export interface SyncTask {
  type: 'download' | 'upload'
  name: string
  override: boolean
}

export interface DownloadTask extends SyncTask {
  type: 'download'
}

export interface UploadTask extends SyncTask {
  type: 'upload'
  content: Uint8Array
  mimeType: string
}
