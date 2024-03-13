import { Messager } from '@/libs/Messager'

describe('Messager', () => {
  let messager: Messager

  beforeEach(() => {
    messager = new Messager()
  })

  it('should dispatch event', () => {
    const mockHandle = jest.fn()
    messager.addEventListener('test', mockHandle)
    messager.dispatchEvent('test')
    expect(mockHandle).toHaveBeenCalledTimes(1)
  })

  it('should dispatch multiple events', () => {
    const mockHandle = jest.fn()
    messager.addEventListener(['test1', 'test2'], mockHandle)
    messager.dispatchEvent('test1')
    messager.dispatchEvent('test2')
    expect(mockHandle).toHaveBeenCalledTimes(2)
  })

  it('should remove event listener', () => {
    const mockHandle = jest.fn()
    const deprecate = messager.addEventListener('test', mockHandle)
    deprecate()
    messager.dispatchEvent('test')
    expect(mockHandle).toHaveBeenCalledTimes(0)
  })

  it('should remove all event listeners', () => {
    const mockHandle1 = jest.fn()
    const mockHandle2 = jest.fn()
    messager.addEventListener('test1', mockHandle1)
    messager.addEventListener('test2', mockHandle2)
    messager.removeAllListeners()
    messager.dispatchEvent('test1')
    messager.dispatchEvent('test2')
    expect(mockHandle1).toHaveBeenCalledTimes(0)
    expect(mockHandle2).toHaveBeenCalledTimes(0)
  })

  it('should add once event listener', () => {
    const mockHandle = jest.fn()
    messager.addOnceEventListener('test', mockHandle)
    messager.dispatchEvent('test')
    messager.dispatchEvent('test')
    expect(mockHandle).toHaveBeenCalledTimes(1)
  })
})
