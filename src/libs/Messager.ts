import { narrow } from '@/utils'
import { debug } from '@/services/pretty'

export type EventType = string | string[] | Set<string>
export type Action<T = unknown> = (payload: T) => void

export interface Message<T> {
  type: string
  value: T
}

export interface MessagerOptions {
  speaker?: EventTarget
}

export class Messager {
  protected speaker: EventTarget
  protected deprecatedListeners: [() => void, string[], (event: Event) => void, Action<any>][]
  protected deprecateMessageHandle: (event: MessageEvent) => void

  constructor(options?: MessagerOptions) {
    const { speaker = new EventTarget() } = options || {}

    this.speaker = speaker
    this.deprecatedListeners = []
  }

  /** 触发监听事件 */
  public dispatchEvent<T>(eventType: EventType, detail?: T) {
    const types = narrow(eventType)
    for (const type of types) {
      const message = new CustomEvent(type, { detail, bubbles: true, cancelable: true })
      this.speaker.dispatchEvent(message)
    }

    debug(`Received "${types}" Event.`, '\n', detail)
  }

  public addEventListener<T>(eventType: EventType, handle: Action<T>) {
    if (typeof handle !== 'function') {
      throw new Error('handle must be a function')
    }

    const types = narrow(eventType)
    const onMessage = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      handle(event.detail)
    }

    const deprecate = () => {
      types.forEach((type) => this.speaker.removeEventListener(type, onMessage, false))
      this.deprecatedListeners = this.deprecatedListeners.filter(([,, deprecatedHandle]) => {
        return handle === deprecatedHandle
      })
    }

    types.forEach((type) => this.speaker.addEventListener(type, onMessage, false))
    this.deprecatedListeners.push([deprecate, types, onMessage, handle])
    return deprecate
  }

  public removeEventListener(eventType: EventType, handle: Action) {
    const isRemoveAll = arguments.length === 1
    const events = narrow(eventType)

    this.deprecatedListeners = this.deprecatedListeners.filter(([, deprecatedEvents, deprecatedHandle, symbolHandle]) => {
      if (isRemoveAll === true || handle === symbolHandle) {
        deprecatedEvents = deprecatedEvents.filter((event) => events.includes(event))
        deprecatedEvents.forEach((event) => this.speaker.removeEventListener(event, deprecatedHandle, false))
      }

      return deprecatedEvents.length > 0
    })
  }

  public addOnceEventListener<T>(eventType: EventType, handle: Action<T>) {
    if (typeof handle !== 'function') {
      throw new Error('handle must be a function')
    }

    const types = narrow(eventType)
    const onMessage = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      deprecate()
      handle(event.detail)
    }

    const deprecate = () => {
      types.forEach((type) => this.speaker.removeEventListener(type, onMessage, false))
      this.deprecatedListeners = this.deprecatedListeners.filter(([, , deprecatedHandle]) => {
        return handle === deprecatedHandle
      })
    }

    types.forEach((type) => this.speaker.addEventListener(type, onMessage, false))
    this.deprecatedListeners.push([deprecate, types, onMessage, handle])
    return deprecate
  }

  public removeAllListeners() {
    const listeners = this.deprecatedListeners.splice(0)
    listeners.forEach(([deprecate]) => deprecate())
  }
}
