import type { GDFileFieldKey, FSFileKey, FSFolderKey, TaskKey } from '@/types'

/* prefix of logger */
export const LOGGER_BANNER = 'cloudfs'

/* base folder in google drive */
export const GOOGLE_DRIVE_BASE_FOLDER_NAME = 'cloudfs'

/* url of google drive upload */
export const GOOGLE_DRIVE_UPLOAD_URL = (_: TemplateStringsArray, fileId?: string) =>
  `https://www.googleapis.com/upload/drive/v3/files/${fileId || ''}?uploadType=resumable&fields=id`

/* url of google drive download */
export const GOOGLE_DRIVE_DOWNLOAD_URL = (_: TemplateStringsArray, fileId: string) => `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

/* discovery doc for google drive api */
export const GOOGLE_DRIVE_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']

/* scopes required for google drive api */
export const GOOGLE_DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'].join(' ')

export const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'

/* slice size of the uploaded file */
export const GOOGLE_DRIVE_UPLOAD_CHUNK_SIZE = 1024 * 1024 * 1

/* local storage key for google drive access token */
export const GOOGLE_DRIVE_ACCESS_TOKEN_LOCALSTORAGE_NAME = 'ACCESS_TOKEN@CLOUDFS'

/* default file fields */
export const GOOGLE_DRIVE_FILE_FIELDS: GDFileFieldKey[] = ['id', 'name', 'mimeType', 'modifiedTime', 'md5Checksum']

/* folder mimeType in google drive */
export const GOOGLE_DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

/* name of the database for file system data */
export const FS_DATABASE = 'fs'

/* the data version of indexedDB */
export const FS_DATABASE_VERSION = 1

/* name of the store for file data */
export const FS_FILE_STORE_NAME = 'Files'

/* indexes for file data */
export const FS_FILE_STORE_INDEXES: FSFileKey[] = ['name', 'lastModified', 'folder', 'mimeType', 'md5Checksum']

/* name of the store for folder data */
export const FS_FOLDER_STORE_NAME = 'Folders'

/* indexes for folder data */
export const FS_FOLDER_STORE_INDEXES: FSFolderKey[] = ['name', 'parent', 'lastModified']

/* name of the database for task queue data */
export const TASK_QUEUE_DATABASE = 'queue'

/* the data version of indexedDB */
export const TASK_QUEUE_DATABASE_VERSION = 1

/* name of the store for task queue data */
export const TASK_QUEUE_TASK_STORE_NAME = 'Tasks'

/* indexes for task queue data */
export const TASK_QUEUE_TASK_STORE_INDEXES: TaskKey[] = ['name', 'status']
