import type { Assign } from 'utility-types'

export interface GDFileField {
  /* 表示此资源的类型。对于 Drive API，此值始终为 drive#file。 */
  kind: string
  /* 文件的唯一标识符。 */
  id: string
  /* 文件的名称。 */
  name: string
  /* 文件的 MIME 类型。 */
  mimeType: string
  /* 文件的描述。 */
  description: string
  /* 用户是否已将此文件标记为星标。 */
  starred: boolean
  /* 文件是否已移至回收站。 */
  trashed: boolean
  /* 用户是否已明确将此文件移至回收站。 */
  explicitlyTrashed: boolean
  /* 文件的父目录的 ID 列表。 */
  parents: string[]
  /* 文件的属性。 */
  properties: object
  /* 文件的应用程序特定属性。 */
  appProperties: object
  /* 文件所在的 Drive。 */
  spaces: string[]
  /* 文件的版本。 */
  version: string
  /* 文件在 Drive 中的 WebView 链接。 */
  webViewLink: string
  /* 文件图标的链接。 */
  iconLink: string
  /* 文件是否有缩略图。 */
  hasThumbnail: boolean
  /* 文件的缩略图链接。 */
  thumbnailLink: string
  /* 文件的缩略图版本。 */
  thumbnailVersion: string
  /* 用户是否已查看此文件。 */
  viewedByMe: boolean
  /* 用户最后查看文件的时间。 */
  viewedByMeTime: string
  /* 文件的创建时间。 */
  createdTime: string
  /* 文件的修改时间。 */
  modifiedTime: string
  /* 用户最后修改文件的时间。 */
  modifiedByMeTime: string
  /* 文件最后与用户共享的时间。 */
  sharedWithMeTime: string
  /* 与用户共享文件的用户。 */
  sharingUser: object
  /* 文件的所有者。 */
  owners: object[]
  /* 文件所在的团队驱动器的 ID。 */
  teamDriveId: string
  /* 最后修改文件的用户。 */
  lastModifyingUser: object
  /* 文件是否已共享。 */
  shared: boolean
  /* 用户是否拥有此文件。 */
  ownedByMe: boolean
  /* 文件的功能。 */
  capabilities: object
  /* 查看者是否可以复制文件内容。 */
  viewersCanCopyContent: boolean
  /* 编写者是否可以共享文件。 */
  writersCanShare: boolean
  /* 文件的权限 ID 列表。 */
  permissionIds: string[]
  /* 文件的权限列表。 */
  permissions: object[]
  /* 文件夹的背景颜色。 */
  folderColorRgb: string
  /* 文件的原始文件名。 */
  originalFilename: string
  /* 文件的完整文件扩展名。 */
  fullFileExtension: string
  /* 文件的文件扩展名。 */
  fileExtension: string
  /* 文件的 MD5 校验和。 */
  md5Checksum: string
  /* 文件的大小（字节）。 */
  size: number
  /* 文件使用的配额字节数。 */
  quotaBytesUsed: number
  /* 文件的头版本 ID。 */
  headRevisionId: string
  /* 文件的内容提示。 */
  contentHints: object
  /* 图像文件的元数据。 */
  imageMediaMetadata: object
  /* 视频文件的元数据。 */
  videoMediaMetadata: object
  /* 文件是否已授权应用程序访问。 */
  isAppAuthorized: boolean
}

export type GDFileFieldKey = keyof GDFileField

export type FSFileContent = string | number | ArrayBuffer | Uint8Array | Blob | null

export type FSFile<T = Record<never, unknown>> = Assign<
  {
    name: string
    size: number
    content: Uint8Array
    mimeType: `${string}/${string}`
    folder: string
    lastModified: Date
    md5Checksum: string
  },
  T extends Record<string, any> ? T : never
>

export type FSFileKey = keyof FSFile

export interface FSFolder {
  name: string
  parent: string
  lastModified: Date
}

export type FSFolderKey = keyof FSFolder

export interface Task<T = any> {
  id: string
  name: string
  data: T
  status: 'idle' | 'pending' | 'completed' | 'failed'
  retryCount: number
  createdAt: Date
  updatedAt: Date
}

export type TaskKey = keyof Task
