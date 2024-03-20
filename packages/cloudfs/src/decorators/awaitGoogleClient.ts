import { SCRIPT_GOOGLE_API, SCRIPT_GOOGLE_GIS_CLIENT } from '@/constants/defination'
import { waitScript } from '@/utils/waitScript'

export function awaitGoogleClient(_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
  const originalFn = descriptor.value
  descriptor.value = async function (...args: any[]) {
    typeof google === 'undefined' && (await waitScript(SCRIPT_GOOGLE_GIS_CLIENT))
    typeof gapi === 'undefined' && (await waitScript(SCRIPT_GOOGLE_API))
    return originalFn.call(this, ...args)
  }

  return descriptor
}
