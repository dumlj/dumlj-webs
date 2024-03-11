import mime from 'mime'
import { isMatch } from 'micromatch'
import type { GoogleAuthConfig } from '@/libs/GoogleAuth';
import { GoogleAuth } from '@/libs/GoogleAuth'
import { TaskQueue } from '@/libs/TaskQueue'
import { toUint8Array, joinPath, stringifyFileField, withProgress, type Progress, guid } from '@/utils'
import {
  GOOGLE_DRIVE_FOLDER_MIME_TYPE,
  GOOGLE_DRIVE_BASE_FOLDER_NAME,
  GOOGLE_DRIVE_UPLOAD_URL,
  GOOGLE_DRIVE_SCOPES,
  GOOGLE_DRIVE_UPLOAD_CHUNK_SIZE,
  GOOGLE_DRIVE_DOWNLOAD_URL,
  GOOGLE_DRIVE_FILE_FIELDS,
  GOOGLE_DRIVE_UPLOAD_EVENT,
} from '@/constants'
import type { FSFileContent, GDFileFieldKey } from '@/types'

export interface GoogleDriveOptions {
  root?: string
}

export interface GoogleDriveTaskInfo {
  id: string
  uploadUrl: string
  start: number
  end: number
  body: Uint8Array
  totalSize: number
}

export interface GlobOptions {
  root?: string
}

export interface QueryOptions {
  name?: string
  parent?: string
  folder?: boolean
  fields?: GDFileFieldKey[]
  pageSize?: number
  pageToken?: string
}

export interface DownloadOptions {
  onProgress?(progress: Progress): void
}

export interface UploadOptions {
  mimeType?: string
  lastModified?: number
  byteLength?: number
  fileId?: string
  onProgress?(progress: Progress): void
}

export class GoogleDrive extends GoogleAuth {
  protected queue
  protected root

  constructor(auth: Omit<GoogleAuthConfig, 'scope'>, options?: GoogleDriveOptions) {
    super({ ...auth, scope: GOOGLE_DRIVE_SCOPES })

    const { root } = options || {}
    this.root = root || GOOGLE_DRIVE_BASE_FOLDER_NAME
    this.queue = new TaskQueue<GoogleDriveTaskInfo>('GoogleDrive', async ({ data }) => {
      const { id, uploadUrl, start, end, body, totalSize } = data

      const headers = new Headers()
      headers.set('Content-Range', `bytes ${start}-${end - 1}/${totalSize}`)

      const response = await this.fetch(uploadUrl, 'PUT', { credentials: 'omit', headers, body })
      await response.blob()

      const process = parseFloat((end / totalSize).toFixed(2))
      this.messager.dispatchEvent(GOOGLE_DRIVE_UPLOAD_EVENT, { id, loaded: end, process, total: totalSize })
    })
  }

  public async glob(pattern: string | string[], options?: GlobOptions) {
    const { root = '/' } = options || {}
    const parent = await this.findRootFolderId()
    const result: gapi.client.drive.File[] = []
    for await (const files of await this.queryWithPagination({ parent, folder: false })) {
      if (!Array.isArray(files)) {
        continue
      }

      for (const file of files) {
        const filePath = joinPath(file.name!)
        if (!isMatch(filePath, pattern, { cwd: root })) {
          continue
        }

        result.push(file)
      }
    }

    return result
  }

  public async download(name: string, options?: DownloadOptions) {
    const { onProgress } = options || {}
    const fileId = await this.findFileId(name)
    if (typeof fileId !== 'string') {
      return null
    }

    const response = await this.fetch(GOOGLE_DRIVE_DOWNLOAD_URL`${fileId}`, 'GET')
    if (typeof onProgress !== 'function') {
      return response.blob()
    }

    return withProgress(response, onProgress)
  }

  public async upload(name: string, content: FSFileContent, options?: UploadOptions) {
    const { onProgress } = options || {}
    const id = guid()
    const source = await toUint8Array(content)
    const totalSize = source.byteLength
    const size = Math.ceil(totalSize / GOOGLE_DRIVE_UPLOAD_CHUNK_SIZE)
    const uploadUrl = await this.resumableUpload(name, { ...options, byteLength: totalSize })

    for (let i = 0; i < size; i++) {
      const start = i * GOOGLE_DRIVE_UPLOAD_CHUNK_SIZE
      const end = Math.min(totalSize, (i + 1) * GOOGLE_DRIVE_UPLOAD_CHUNK_SIZE)
      const body = source.slice(start, end)
      this.queue.addTask({ id, start, end, body, uploadUrl, totalSize })
    }

    if (typeof onProgress === 'function') {
      const deprecate = this.messager.addEventListener<Progress & { id: string }>(GOOGLE_DRIVE_UPLOAD_EVENT, (progress) => {
        if (!(progress.id === id)) {
          return
        }

        onProgress({ ...progress })
        progress.loaded >= 1 && deprecate()
      })
    }
  }

  /** 分片上传 */
  protected async resumableUpload(name: string, options?: UploadOptions) {
    const { mimeType: inputMimeType, byteLength, fileId } = options || {}

    const parentId = await this.findRootFolderId()
    const { mimeType, body } = (() => {
      if (fileId) {
        return { mimeType: undefined, body: undefined }
      }

      const mimeType = inputMimeType || mime.getType(name) || 'text/plain'
      const parents = [parentId]
      const body = JSON.stringify({ name, mimeType, parents })
      return { mimeType, body }
    })()

    const headers = new Headers()
    mimeType && headers.set('X-Upload-Content-Type', mimeType)
    byteLength && headers.set('X-Upload-Content-Length', byteLength.toString())

    const response = await this.fetch(GOOGLE_DRIVE_UPLOAD_URL`${fileId}`, fileId ? 'PATCH' : 'POST', { headers, body })
    const location = response.headers.get('Location')
    return location!
  }

  protected async findFileId(name: string) {
    const parent = await this.findRootFolderId()
    const response = await this.query({ name, parent, folder: false })
    return response.result.files?.shift()?.id
  }

  /** 查找根文件夹 ID */
  protected async findRootFolderId() {
    const folders = await this.findFoldersByName(this.root)
    const folder = folders?.shift() || (await this.createFolder(this.root))
    if (typeof folder?.id !== 'string') {
      throw new Error(`Root folder ${this.root} can not get or create.`)
    }

    return folder.id
  }

  /** 通过名称查找文件夹 */
  protected async findFoldersByName(name: string) {
    const response = await this.query({ name, folder: true })
    const folders = response.result.files
    return folders
  }

  /** 创建文件夹 */
  protected async createFolder(name: string) {
    const response = await this.handleClientResponse(
      gapi.client.drive.files.create({
        fields: stringifyFileField(['id', 'name', 'mimeType', 'modifiedTime']),
        resource: {
          name: name,
          mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
        },
      })
    )

    return response.result
  }

  protected async queryWithPagination(options?: QueryOptions) {
    return (async function* RequestGenerator(self) {
      let pageToken: string = undefined!
      while (true) {
        const response = await self.query({ ...options, pageToken })
        yield response.result.files
        if (!response.result.nextPageToken) {
          break
        }

        pageToken = response.result.nextPageToken
      }
    })(this)
  }

  protected async query(options?: QueryOptions) {
    const { folder, parent, name, fields: fileFields = GOOGLE_DRIVE_FILE_FIELDS, pageSize, pageToken } = options || {}
    const queryString: string[] = ['trashed = false']

    if (typeof folder === 'boolean') {
      queryString.push(`mimeType ${folder ? '=' : '!='} '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`)
    }

    if (typeof parent === 'string') {
      queryString.push(`'${parent}' in parents`)
    }

    if (typeof name === 'string') {
      queryString.push(`name = '${name}'`)
    }

    const q = queryString.join(' and ')
    const fields = ['nextPageToken', stringifyFileField(fileFields)].join(', ')
    return this.handleClientResponse(gapi.client.drive.files.list({ q, fields, pageSize, pageToken }))
  }

  protected async fetch(url: string, method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH', options?: Omit<RequestInit, 'method'>) {
    const { headers: inputHeaders, body } = options || {}
    const headers = new Headers(inputHeaders)
    headers.set('Authorization', `Bearer ${this.accessToken}`)
    headers.set('Content-Type', 'application/json; charset=UTF-8')

    const response = await fetch(url, { method, headers, body })
    this.checkResponseForError(response?.status)
    return response
  }

  protected async handleClientResponse<R>(request: gapi.client.Request<R>): Promise<gapi.client.Response<R>> {
    try {
      return await request
    } catch (error) {
      if (typeof error === 'object' && error !== null) {
        if ('status' in error && (typeof error.status === 'string' || typeof error.status === 'number')) {
          error.status && this.checkResponseForError(error.status)
        }
      }

      throw error
    }
  }

  protected checkResponseForError(status: number | string) {
    const statusCode = Number(status)
    if (statusCode === 401) {
      this.clearAccessToken()
      throw new Error('Authorization expires.')
    }

    if (statusCode >= 400) {
      throw new Error(`Request failed with ${statusCode}.`)
    }
  }
}
