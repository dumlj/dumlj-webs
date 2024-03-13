export type EqualsFn<T> = (cursor: IDBCursorWithValue, data: T) => boolean

export interface IndexedDBCreateStoreParameters {
  options?: IDBObjectStoreParameters
  indexes?: Array<{
    name: string
    keyPath: string | string[]
    options?: IDBIndexParameters
  }>
}

export type IndexedDBStoreOptions = Record<string, IndexedDBCreateStoreParameters>

export interface IndexedDBOptions {
  database: string
  version: number
  store?: IndexedDBStoreOptions
}

export class IndexedDB {
  private db: IDBDatabase

  public database: string
  public version: number
  public store?: IndexedDBStoreOptions

  constructor(options: IndexedDBOptions) {
    const { store, database, version } = options

    this.database = database
    this.version = version
    this.store = store
  }

  /**
   * 打开数据库
   * @param database 数据库名称
   * @param version 数据库版本
   */
  public open(database: string = this.database, version: number = this.version) {
    return new Promise<IDBDatabase>((resolve, reject) => {
      if (this.db) {
        resolve(this.db)
        return
      }

      const openRequest = indexedDB.open(database, version)
      openRequest.onerror = (error) => reject(error)
      openRequest.onupgradeneeded = (event) => {
        try {
          if (event.oldVersion === 0) {
            this.db = openRequest.result
            if (typeof this.store === 'object' && this.store !== null) {
              this.initStores(this.store)
            }
          }
        } catch (error) {
          reject(error)
        }
      }

      openRequest.onsuccess = () => {
        this.db = openRequest.result
        if (this.db.objectStoreNames.length === 0) {
          resolve(this.recover())
          return
        }

        resolve(this.db)
      }

      this.database = database
      this.version = version
    })
  }

  public close() {
    this.db && this.db.close()
  }

  /** 初始化数据表 */
  public initStores(stores: IndexedDBStoreOptions) {
    if (!this.db) {
      return
    }

    for (const [name, store] of Object.entries(stores)) {
      const craeteStore = this.createStoreFactory(store)
      craeteStore(name)
    }
  }

  /** 创建数据表 */
  public createStoreFactory(store: IndexedDBCreateStoreParameters) {
    return (name: string) => {
      const objectStore = this.db.createObjectStore(name, store.options)
      if (!Array.isArray(store.indexes)) {
        return
      }

      for (const { name, keyPath, options } of store.indexes) {
        objectStore.createIndex(name, keyPath, options)
      }
    }
  }

  /**
   * 重置数据表
   * @description
   * 主要用于数据表升级不兼容的情况
   */
  public async recover() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      this.db && this.db.close()

      const openRequest = indexedDB.deleteDatabase(this.database)
      openRequest.onerror = (error) => reject(error)
      openRequest.onsuccess = () => resolve(this.open(this.database, this.version))
    })
  }

  public async getStore(name: string | string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions) {
    const stores = typeof name === 'string' ? [name] : name
    const database = await this.open()
    const transaction = database.transaction(stores, mode, options)
    return stores.map((name) => transaction.objectStore(name))
  }

  public resolveRequest<T>(request: IDBRequest<T>) {
    return new Promise<T>(async (resolve, reject) => {
      request.onerror = (error) => reject(error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * 通过索索引查找所有数据
   * @param store 存储对象
   * @param index 索引名称
   * @param query 搜索条件
   */
  public async getAllByIndex<T>(store: IDBObjectStore, index: string, query: string | number | Date | ArrayBufferView | ArrayBuffer | IDBKeyRange) {
    const dbIndex = store.index(index)
    const getRequest = dbIndex.getAll(query)
    return this.resolveRequest<T[]>(getRequest)
  }

  /**
   * 查找数据
   * @param store 存储对象
   * @param query 搜索条件
   */
  public async get<T>(store: IDBObjectStore, query: string | number | Date | ArrayBufferView | ArrayBuffer | IDBKeyRange) {
    const getRequest = store.get(query)
    return this.resolveRequest<T>(getRequest)
  }

  /**
   * 修改数据
   * @param store 存储对象
   * @param value 数据
   * @param key 键名
   */
  public async put(store: IDBObjectStore, value: any, key?: IDBValidKey) {
    const putRequest = store.put(value, key)
    return this.resolveRequest(putRequest)
  }

  public async delete(store: IDBObjectStore, query: IDBKeyRange | IDBValidKey) {
    const deleteRequest = store.delete(query)
    return this.resolveRequest(deleteRequest)
  }

  /**
   * 更新
   * @param store 存储对象
   * @param index 索引名称
   * @description
   * 如果文件已经存在则修改文件
   * 如果文件不存在则压入数据库中
   */
  public async update<T extends Record<string, any>>(store: IDBObjectStore, index: keyof T, data: T, equals: EqualsFn<T> = (cursor, data) => cursor.value[index] === data[index]) {
    const openRequest = store.index(index as string).openCursor(data[index])
    await this.resolveRequest(openRequest)

    const cursor = openRequest.result
    if (cursor) {
      if (equals(cursor, data)) {
        const { id } = cursor.value
        const updateInfo = Object.assign({ id }, data)
        const updateRequest = cursor.update(updateInfo)
        await this.resolveRequest(updateRequest)
      } else {
        cursor.continue()
      }
    } else {
      const pushRequest = store.add(data)
      await this.resolveRequest(pushRequest)
    }
  }
}
