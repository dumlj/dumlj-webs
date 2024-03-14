import { GoogleDrive } from '@/libs/GoogleDrive'
import { FileSystem } from '@/libs/FileSystem'
import { TaskQueue } from '@/libs//TaskQueue'
import { Logger } from '@/libs/Logger'
import { type GoogleAuthoryEventDetail } from '@/libs/GoogleAuth'
import { type Action } from '@/libs/Messager'
import { retryOnAuthError } from '@/decorators/retryOnAuthError'
import { joinPath, toUint8Array } from '@/utils'
import type { DownloadTask, UploadTask } from './types'

export interface SyncConfiguration {
  database: string
  googleClientId: string
  googleApiKey: string
}

export class SyncService {
  protected fs: FileSystem
  protected logger = new Logger('Sync')
  protected gd: GoogleDrive
  protected queue: TaskQueue<UploadTask | DownloadTask>

  public get isAuthorized() {
    return this.gd.isAuthorized
  }

  constructor(config: SyncConfiguration) {
    const { database, googleApiKey, googleClientId } = config

    this.fs = new FileSystem(database)
    this.gd = new GoogleDrive({ clientId: googleClientId, apiKey: googleApiKey })
    this.queue = new TaskQueue<UploadTask | DownloadTask>('Sync', async ({ data }) => {
      const { type, name } = data
      switch (type) {
        case 'download': {
          const source = await this.gd.download(name)
          if (source) {
            const buffer = await toUint8Array(source)
            await this.fs.writeFile(name, buffer)
          }

          break
        }

        case 'upload': {
          const { content, mimeType } = data
          if (content?.byteLength > 0) {
            await this.gd.upload(name, content, { mimeType })
            break
          }

          await this.gd.rm(name)
          await this.fs.clear(name)
          break
        }
      }
    })
  }

  @retryOnAuthError
  public async open() {
    await this.gd.open()
  }

  @retryOnAuthError
  public async download() {
    await this.gd.open()

    const files = await this.gd.glob('**/*')
    const fileMap = new Map(files.map((file) => [joinPath(file.name!), file] as const))
    const downloads = Array.from(
      (function* () {
        for (const [name] of fileMap.entries()) {
          yield { name, override: true }
        }
      })()
    )

    this.logger.debug(`${downloads.length || 'No'} files need to download.`)
    for (const file of downloads) {
      this.queue.addTask({ ...file, type: 'download' })
    }
  }

  @retryOnAuthError
  public async upload() {
    await this.gd.open()

    const files = await this.fs.glob('**/*')
    const fileMap = new Map(files.map((file) => [joinPath(file.folder, file.name), file] as const))
    const uploads = Array.from(
      (function* () {
        for (const [name, localFile] of fileMap.entries()) {
          const { content, mimeType } = localFile
          yield { name, override: true, content, mimeType }
        }
      })()
    )

    this.logger.debug(`${uploads.length || 'no'} files need to upload.`)
    for (const file of uploads) {
      this.queue.addTask({ ...file, type: 'upload' })
    }
  }

  @retryOnAuthError
  public async sync() {
    await this.gd.open()

    const { downloads, uploads } = await this.findNeedToSyncFiles()
    this.logger.debug(`${downloads.length || 'No'} files need to download and ${uploads.length || 'no'} files need to upload.`)

    for (const file of downloads) {
      this.queue.addTask({ ...file, type: 'download' })
    }

    for (const file of uploads) {
      this.queue.addTask({ ...file, type: 'upload' })
    }
  }

  public onAuthChanged(action: Action<GoogleAuthoryEventDetail>) {
    const deprecated = this.gd.onAuthChanged(action)
    if (typeof gapi?.client === 'undefined') {
      this.gd.ping()
    }

    return deprecated
  }

  protected async findNeedToSyncFiles() {
    const remoteFiles = await this.gd.glob('**/*')
    const localFiles = await this.fs.glob('**/*')

    const remoteFileMap = new Map(remoteFiles.map((file) => [joinPath(file.name!), file] as const))
    const localFileMap = new Map(localFiles.map((file) => [joinPath(file.folder, file.name), file] as const))

    const downloads = Array.from(
      (function* () {
        for (const [name, remoteFile] of remoteFileMap.entries()) {
          const localFile = localFileMap.get(name)
          if (!localFile) {
            yield { name, override: false }
            continue
          }

          if (localFile.md5Checksum === remoteFile.md5Checksum) {
            continue
          }

          if (localFile!.lastModified.getTime() < new Date(remoteFile.modifiedTime!).getTime()) {
            yield { name, override: true }
            continue
          }
        }
      })()
    )

    const uploads = Array.from(
      (function* () {
        for (const [name, localFile] of localFileMap.entries()) {
          const { content, mimeType } = localFile
          const remoteFile = remoteFileMap.get(name)
          if (!remoteFile) {
            yield { name, override: false, content, mimeType }
            continue
          }

          if (remoteFile.md5Checksum === localFile.md5Checksum) {
            continue
          }

          if (new Date(remoteFile.modifiedTime!).getTime() < localFile!.lastModified.getTime()) {
            yield { name, override: true, content, mimeType }
            continue
          }
        }
      })()
    )

    return { downloads, uploads }
  }
}
