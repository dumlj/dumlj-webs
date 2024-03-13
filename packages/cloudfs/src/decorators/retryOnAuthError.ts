export function retryOnAuthError(_t: any, _k: string | symbol, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> | void {
  const originalMethod = descriptor.value
  descriptor.value = async function (...args: any[]) {
    try {
      return await originalMethod.call(this, ...args)
    } catch (error) {
      if (error instanceof Error && /Authorization expires/.test(error.message)) {
        return await originalMethod.call(this, ...args)
      }

      throw error
    }
  }
}
