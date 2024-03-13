import { retryOnAuthError } from '@/decorators/retryOnAuthError'

class MyClass {
  protected logined = false
  protected func: () => Promise<void>
  constructor(func: () => Promise<void>) {
    this.func = func
  }

  @retryOnAuthError
  public async makeRequest() {
    await this.func()
  }
}

describe('retryOnAuthError', () => {
  it('should retry the function when "Authorization expires" error is thrown', async () => {
    const makeRequest = jest
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error('Authorization expires')
      })
      .mockImplementationOnce(async () => {
        return Promise.resolve()
      })

    await new MyClass(makeRequest).makeRequest()
    expect(makeRequest).toHaveBeenCalledTimes(2)
  })

  it('should not retry the function when a different error is thrown', async () => {
    const makeRequest = jest.fn().mockImplementationOnce(() => {
      throw new Error('Some other error')
    })

    const myClass = new MyClass(makeRequest)
    try {
      await myClass.makeRequest()
    } catch (err) {
      expect((err as Error).message).toBe('Some other error')
    }

    expect(makeRequest).toHaveBeenCalledTimes(1)
  })
})
