import 'blob-polyfill'

import IDBFactory from 'fake-indexeddb/lib/FDBFactory'
import IDBDatabase from 'fake-indexeddb/lib/FDBDatabase'
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange'
import IDBObjectStore from 'fake-indexeddb/lib/FDBObjectStore'

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: new IDBFactory(),
})

Object.defineProperty(window, 'IDBDatabase', {
  writable: true,
  value: IDBDatabase,
})

Object.defineProperty(window, 'IDBKeyRange', {
  writable: true,
  value: IDBKeyRange,
})

Object.defineProperty(window, 'IDBObjectStore', {
  writable: true,
  value: IDBObjectStore,
})
