interface ScriptInfo {
  node: HTMLScriptElement
  status: 'padding' | 'loaded' | 'fail'
}

const Scripts = new Map<string, ScriptInfo>()

export interface LoadScriptOptions {
  src?: string
  append?: boolean
  remove?: boolean
}

export function loadScript(script: HTMLScriptElement, options?: LoadScriptOptions) {
  const { src, append, remove } = options || {}
  return new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      script.removeEventListener('load', onLoad)
      remove && document.removeChild(script)
      resolve()
    }

    const onError = (error: any) => {
      script.removeEventListener('error', onError)
      remove && document.removeChild(script)
      reject(error)
    }

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)

    typeof src === 'string' && (script.src = src)
    append && document.appendChild(script)
  })
}

export async function waitScript(src: string) {
  if (Scripts.has(src)) {
    const { node, status } = Scripts.get(src)!
    if (status === 'loaded') {
      return
    }

    if (status === 'padding') {
      return loadScript(node)
    }

    if (status === 'fail') {
      Scripts.delete(src)
    }
  }

  const node = document.createElement('script')
  Scripts.set(src, { node, status: 'padding' })

  const promise = loadScript(node)
  document.body.appendChild(node)
  node.src = src

  try {
    await promise

    Scripts.set(src, { node, status: 'loaded' })
    document.body.removeChild(node)
  } catch (error) {
    Scripts.set(src, { node, status: 'fail' })
    return Promise.reject(error)
  }
}
