import { isMatch } from 'micromatch'
import { IndexedDB } from '@/libs/IndexedDB'
import { resolveFile, joinPath, toUint8Array, calculateMD5Checksum } from '@/utils'
import { FS_FILE_STORE_NAME, FS_FILE_STORE_INDEXES, FS_FOLDER_STORE_NAME, FS_FOLDER_STORE_INDEXES, FS_DATABASE_VERSION } from '@/constants'
import * as EVENTS from '@/constants/event'
import { Logger } from '@/libs/Logger'
import { Messager } from '@/libs/Messager'
import type { FSFileContent, FSFile, FSFolder } from '@/types'

export interface WriteFileOptions {
  mimeType?: string
}

export interface GlobOptions {
  root?: string
}

// prettier-ignore
export type FileSystemOptions = Partial<
  Record<
    | Uncapitalize<`${typeof FS_FILE_STORE_NAME}Indexes`>
    | Uncapitalize<`${typeof FS_FOLDER_STORE_NAME}Indexes`>
  , Readonly<string[]>>
>

export class FileSystem {
  protected messager = new Messager()
  protected logger = new Logger('FS')
  protected db: IndexedDB

  constructor(name: string, options?: FileSystemOptions) {
    const { filesIndexes = [], foldersIndexes = [] } = options || {}

    if (typeof name !== 'string') {
      throw new Error(`Database of indexdb must not be empty`)
    }

    this.db = new IndexedDB({
      database: name,
      version: FS_DATABASE_VERSION,
      store: {
        [FS_FILE_STORE_NAME]: {
          indexes: Array.from(
            (function* () {
              for (const name of [...FS_FILE_STORE_INDEXES, ...filesIndexes]) {
                yield {
                  name,
                  keyPath: name,
                  options: { unique: false },
                }
              }
            })()
          ),
        },
        [FS_FOLDER_STORE_NAME]: {
          indexes: Array.from(
            (function* () {
              for (const name of [...FS_FOLDER_STORE_INDEXES, ...foldersIndexes]) {
                yield {
                  name,
                  keyPath: name,
                  options: { unique: false },
                }
              }
            })()
          ),
        },
      },
    })
  }

  public async findFilesByIndex<T extends Record<string, any>>(index: string, value: string) {
    const [fileStore] = await this.db.getStore([FS_FILE_STORE_NAME], 'readonly')
    const fileIndex = fileStore.index(index)
    const fileRequest = fileIndex.getAll(IDBKeyRange.only(value))
    const filesResp = await this.db.resolveRequest<FSFile<T>[]>(fileRequest)
    return filesResp
  }

  public async glob<T extends Record<string, any>>(pattern: string | string[], options?: GlobOptions) {
    const { root = '/' } = options || {}
    const primaryKey = this.resolvePrimaryKey(root)
    const [fileStore] = await this.db.getStore([FS_FILE_STORE_NAME], 'readwrite')

    const fileIndex = fileStore.index('folder')
    const fileRequest = fileIndex.getAll(IDBKeyRange.bound(primaryKey, primaryKey + '\uffff'))
    const filesResp = await this.db.resolveRequest<FSFile<T>[]>(fileRequest)

    const files = Array.from(
      (function* () {
        for (const file of filesResp) {
          const absPath = joinPath(file.folder, file.name)
          if (isMatch(absPath, pattern, { cwd: root })) {
            yield file
          }
        }
      })()
    )

    return files
  }

  public async readFile<T extends Record<string, any>>(file: string) {
    const [store] = await this.db.getStore(FS_FILE_STORE_NAME, 'readonly')
    const primaryKey = this.resolvePrimaryKey(file)
    const result = await this.db.get<FSFile<T>>(store, primaryKey)
    return result
  }

  public async writeFile(file: string, content: FSFileContent, options?: WriteFileOptions) {
    const { dirname: folder } = resolveFile(file)
    const [folderStore, fileStore] = await this.db.getStore([FS_FOLDER_STORE_NAME, FS_FILE_STORE_NAME], 'readwrite')

    const mkdir = this.buildDirMaker(folder)
    const writeFile = this.buildFileWriter(file, content, options)

    await mkdir(folderStore)
    await writeFile(fileStore)

    this.messager.dispatchEvent(EVENTS.FS_WRITE_FILE_EVENT, { file, content })
  }

  public async rm(file: string) {
    await this.writeFile(file, null)

    this.logger.debug(`Delete file ${file}`)
    this.messager.dispatchEvent(EVENTS.FS_RM_EVENT, { file })
  }

  public async clear(file: string) {
    const primaryKey = this.resolvePrimaryKey(file)
    const [fileStore] = await this.db.getStore(FS_FILE_STORE_NAME, 'readwrite')
    const request = fileStore.delete(primaryKey)
    await this.db.resolveRequest(request)
  }

  public async readdir(path: string) {
    const primaryKey = this.resolvePrimaryKey(path)
    const [fileStore, folderStore] = await this.db.getStore([FS_FILE_STORE_NAME, FS_FOLDER_STORE_NAME], 'readonly')

    const fileIndex = fileStore.index('folder')
    const fileRequest = fileIndex.getAll(IDBKeyRange.only(primaryKey))
    const filesResp = await this.db.resolveRequest<FSFile[]>(fileRequest)

    const folderIndex = folderStore.index('parent')
    const folderRequest = folderIndex.getAll(IDBKeyRange.only(primaryKey))
    const foldersResp = await this.db.resolveRequest<FSFolder[]>(folderRequest)

    this.logger.debug(`Found ${filesResp.length} files and ${foldersResp} folders.`)

    const files = filesResp.map(({ name }) => name)
    const folders = foldersResp.map(({ name }) => name)
    return [...files, ...folders]
  }

  public async mkdir(path: string) {
    const [store] = await this.db.getStore([FS_FILE_STORE_NAME, FS_FOLDER_STORE_NAME], 'readwrite')
    const writeFolder = this.buildDirMaker(path)
    await writeFolder(store)

    this.messager.dispatchEvent(EVENTS.FS_MKDIR_EVENT, { path })
  }

  public async rmdir(path: string) {
    const primaryKey = this.resolvePrimaryKey(path)
    const [fileStore, folderStore] = await this.db.getStore([FS_FILE_STORE_NAME, FS_FOLDER_STORE_NAME], 'readwrite')

    // 根据文件夹前缀删除所有文件
    const fileIndex = fileStore.index('folder')
    const fileRequest = fileIndex.openCursor(IDBKeyRange.bound(primaryKey, primaryKey + '\uffff'))
    const files = await this.db.resolveRequest(fileRequest)

    for (const file of files?.value) {
      await this.db.put(fileStore, null, file.primaryKey)
    }

    // 根据文件夹前缀删除所有文件夹
    const folderIndex = folderStore.index('parent')
    const folderRequest = folderIndex.openCursor(IDBKeyRange.bound(primaryKey, primaryKey + '\uffff'))
    const folders = await this.db.resolveRequest(folderRequest)

    for (const folder of folders?.value) {
      await this.db.put(folderStore, null, folder.primaryKey)
    }

    this.messager.dispatchEvent(EVENTS.FS_RMDIR_EVENT, { path })
    this.logger.debug(`Delete ${path} and its children`)
  }

  public async pathExists(file: string) {
    const primaryKey = this.resolvePrimaryKey(file)
    const [fileStore, folderStore] = await this.db.getStore([FS_FILE_STORE_NAME, FS_FOLDER_STORE_NAME], 'readonly')

    const fileRequest = fileStore.count(IDBKeyRange.only(primaryKey))
    const fileCount = await this.db.resolveRequest(fileRequest)

    const folderRequest = folderStore.count(IDBKeyRange.only(primaryKey))
    const folderCount = await this.db.resolveRequest(folderRequest)

    return fileCount > 0 || folderCount > 0
  }

  public resolvePrimaryKey(file: string) {
    const { filepath } = resolveFile(file)
    return filepath
  }

  protected buildFileWriter(filePath: string, source: FSFileContent, options?: WriteFileOptions) {
    return async (store: IDBObjectStore) => {
      const { mimeType: inputMimeType } = options || {}
      const { basename: name, dirname: folder, filepath: key, mimeType = inputMimeType } = resolveFile(filePath)
      const lastModified = new Date()
      const content = await toUint8Array(source)
      const md5Checksum = calculateMD5Checksum(content)
      const fields = { name, content, lastModified, folder, mimeType, md5Checksum }

      await this.db.put(store, fields, key)
      this.logger.debug(`Write to ${filePath}`, fields)
    }
  }

  protected buildDirMaker(folder: string) {
    return async (store: IDBObjectStore) => {
      const { basename: name, dirname: parent, filepath: key } = resolveFile(folder)
      const lastModified = new Date()
      const fields = { name, parent, lastModified }

      await this.db.put(store, fields, key)
      this.logger.debug(`Write to ${folder}`, fields)
    }
  }

  public joinPath(...path: string[]) {
    return joinPath(...path)
  }
}
