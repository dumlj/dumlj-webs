import { isMatch } from 'micromatch'
import { IndexedDB } from '@/libs/IndexedDB'
import { resolveFile, joinPath, toUint8Array, calculateMD5Checksum } from '@/utils'
import { FS_DATABASE, FS_FILE_STORE_NAME, FS_FILE_STORE_INDEXES, FS_FOLDER_STORE_NAME, FS_FOLDER_STORE_INDEXES, FS_DATABASE_VERSION } from '@/constants'
import type { FSFileContent, FSFile, FSFolder } from '@/types'

export interface WriteFileOptions {
  mimeType?: string
}

export interface GlobOptions {
  root?: string
}

export class FileSystem {
  protected db: IndexedDB

  constructor() {
    this.db = new IndexedDB({
      database: FS_DATABASE,
      version: FS_DATABASE_VERSION,
      store: {
        [FS_FILE_STORE_NAME]: {
          indexes: Array.from(
            (function* () {
              for (const name of FS_FILE_STORE_INDEXES) {
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
              for (const name of FS_FOLDER_STORE_INDEXES) {
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

  public async glob(pattern: string | string[], options?: GlobOptions) {
    const { root = '/' } = options || {}
    const primaryKey = this.resolvePrimaryKey(root)
    const [fileStore] = await this.db.getStore([FS_FILE_STORE_NAME], 'readwrite')

    const fileIndex = fileStore.index('folder')
    const fileRequest = fileIndex.getAll(IDBKeyRange.bound(primaryKey, primaryKey + '\uffff'))
    const filesResp = await this.db.resolveRequest<FSFile[]>(fileRequest)
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

  public async readFile(file: string) {
    const [store] = await this.db.getStore(FS_FILE_STORE_NAME, 'readonly')
    const primaryKey = this.resolvePrimaryKey(file)
    return this.db.get<FSFile>(store, primaryKey)
  }

  public async writeFile(file: string, content: FSFileContent, options?: WriteFileOptions) {
    const { dirname: folder } = resolveFile(file)
    const [folderStore, fileStore] = await this.db.getStore([FS_FOLDER_STORE_NAME, FS_FILE_STORE_NAME], 'readwrite')

    const mkdir = this.buildDirMaker(folder)
    const writeFile = this.buildFileWriter(file, content, options)

    await mkdir(folderStore)
    await writeFile(fileStore)
  }

  public async rm(file: string) {
    const primaryKey = this.resolvePrimaryKey(file)
    const [store] = await this.db.getStore(FS_FILE_STORE_NAME, 'readwrite')

    await this.db.put(store, null, primaryKey)
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

    const files = filesResp.map(({ name }) => name)
    const folders = foldersResp.map(({ name }) => name)
    return [...files, ...folders]
  }

  public async mkdir(path: string) {
    const [store] = await this.db.getStore([FS_FILE_STORE_NAME, FS_FOLDER_STORE_NAME], 'readwrite')
    const writeFolder = this.buildDirMaker(path)
    await writeFolder(store)
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
      return this.db.put(store, { name, content, lastModified, folder, mimeType, md5Checksum }, key)
    }
  }

  protected buildDirMaker(folder: string) {
    return (store: IDBObjectStore) => {
      const { basename: name, dirname: parent, filepath: key } = resolveFile(folder)
      const lastModified = new Date()
      return this.db.put(store, { name, parent, lastModified }, key)
    }
  }
}
