import CryptoJS from 'crypto-js'

export function calculateMD5Checksum(arrayBuffer: ArrayBuffer) {
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer)
  return CryptoJS.MD5(wordArray).toString()
}
