import { GoogleDrive } from '@/libs/GoogleDrive'
import { FileSystem } from '@/libs/FileSystem'
import { TaskQueue } from '@/libs//TaskQueue'
import { debug } from '@/services/pretty'
import { joinPath, toUint8Array } from '@/utils'
import type { DownloadTask, UploadTask } from './types'

export interface SyncConfiguration {
  googleClientId: string
  googleApiKey: string
}

export class SyncService {
  protected fs = new FileSystem()
  protected gd
  protected queue

  constructor(config: SyncConfiguration) {
    const { googleApiKey, googleClientId } = config

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
          await this.gd.upload(name, content, { mimeType })
          break
        }
      }
    })
  }

  public async sync() {
    await this.gd.open()

    const { downloads, uploads } = await this.findNeedToSyncFiles()
    debug(`${downloads.length || 'No'} files need to download and ${uploads.length || 'no'} files need to upload.`, {
      downloads: downloads.map(({ name }) => name),
      uploads: uploads.map(({ name }) => name),
    })

    for (const file of downloads) {
      this.queue.addTask({ ...file, type: 'download' })
    }

    for (const file of uploads) {
      this.queue.addTask({ ...file, type: 'upload' })
    }
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
