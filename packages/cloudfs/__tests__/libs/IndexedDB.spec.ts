import { IndexedDB } from '@/libs/IndexedDB'

describe('IndexedDB', () => {
  let indexedDB: IndexedDB

  beforeEach(() => {
    indexedDB = new IndexedDB({
      database: 'test-database',
      version: 1,
      store: {
        users: {
          options: {
            keyPath: 'id',
            autoIncrement: true,
          },
          indexes: [
            {
              name: 'name',
              keyPath: 'name',
            },
          ],
        },
      },
    })
  })

  it('should open the database', async () => {
    const db = await indexedDB.open()
    expect(db).toBeInstanceOf(IDBDatabase)
    expect(db.name).toBe('test-database')
    expect(db.version).toBe(1)
  })

  it('should create the object stores', async () => {
    const db = await indexedDB.open()
    const objectStoreNames = db.objectStoreNames
    expect(objectStoreNames).toContain('users')
  })

  it('should create the indexes', async () => {
    const db = await indexedDB.open()
    const objectStore = db.transaction('users').objectStore('users')
    const indexNames = objectStore.indexNames
    expect(indexNames).toContain('name')
  })

  it('should get a store', async () => {
    const [store] = await indexedDB.getStore('users')
    expect(store).toBeInstanceOf(IDBObjectStore)
    expect(store['name']).toBe('users')
  })

  it('should resolve a request', async () => {
    await indexedDB.open()
    const [store] = await indexedDB.getStore('users', 'readwrite')

    const getRequest = store.get(1)
    const user = await indexedDB.resolveRequest(getRequest)
    expect(user).toBeUndefined()
  })

  it('should get all by index', async () => {
    await indexedDB.open()
    const [store] = await indexedDB.getStore('users', 'readwrite')

    const users = await indexedDB.getAllByIndex(store, 'name', 'John')
    expect(users).toEqual([])
  })

  it('should get a user', async () => {
    await indexedDB.open()
    const [store] = await indexedDB.getStore('users', 'readwrite')

    const user = await indexedDB.get(store, 1)
    expect(user).toBeUndefined()
  })

  it('should put a user', async () => {
    await indexedDB.open()

    const [store] = await indexedDB.getStore('users', 'readwrite')
    const user = {
      id: 1,
      name: 'John',
      age: 30,
    }

    await indexedDB.put(store, user)

    const newUser = await indexedDB.get(store, 1)
    expect(newUser).toEqual(user)
  })

  it('should delete a user', async () => {
    await indexedDB.open()

    const [store] = await indexedDB.getStore('users', 'readwrite')
    await indexedDB.delete(store, 1)

    const user = await indexedDB.get(store, 1)
    expect(user).toBeUndefined()
  })
})
