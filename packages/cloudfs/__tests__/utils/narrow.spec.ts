import { narrow } from '@/utils/narrow'

describe('narrow', () => {
  it('should return an array of unique values', () => {
    const events = [1, 2, 3, 4, 5, 1, 2, 3]

    const narrowedEvents = narrow(events)

    expect(narrowedEvents).toEqual([1, 2, 3, 4, 5])
  })

  it('should convert a set to an array', () => {
    const events = new Set([1, 2, 3, 4, 5])

    const narrowedEvents = narrow(events)

    expect(narrowedEvents).toEqual([1, 2, 3, 4, 5])
  })

  it('should return an array with a single element if the input is not an array or set', () => {
    const event = 1

    const narrowedEvent = narrow(event)

    expect(narrowedEvent).toEqual([1])
  })
})
