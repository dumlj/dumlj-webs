import { calculateMD5Checksum } from '@/utils/calculateMD5Checksum'
import CryptoJS from 'crypto-js'

describe('calculateMD5Checksum', () => {
  it('should calculate the MD5 checksum of an array buffer', () => {
    const arrayBuffer = new ArrayBuffer(16)
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer)
    const expectedChecksum = CryptoJS.MD5(wordArray).toString()
    const checksum = calculateMD5Checksum(arrayBuffer)
    expect(checksum).toBe(expectedChecksum)
  })
})
