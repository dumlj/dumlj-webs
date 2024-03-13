import { TaskQueue } from '@/libs/TaskQueue'

describe('TaskQueue', () => {
  let taskQueue: TaskQueue

  beforeEach(() => {
    taskQueue = new TaskQueue('test', async () => {})
  })

  afterEach(async () => {
    await taskQueue.clear()
  })

  it('should add task', async () => {
    const data = { foo: '1' }
    taskQueue.addTask(data)
    expect(taskQueue['tasks'].size).toBe(1)
  })

  it('should run tasks', async () => {
    const data = { foo: '2' }
    taskQueue.addTask(data)

    await taskQueue.runTasks()
    expect(taskQueue['tasks'].size).toBe(1)
  })

  it('should retry failed tasks', async () => {
    taskQueue = new TaskQueue('test', async () => Promise.reject(new Error('123')), { retryAttempts: 0 })

    const data = { foo: 'failed' }
    taskQueue.addTask(data)

    await taskQueue.runTasks()
    expect(Array.from(taskQueue['tasks'].values())[0].status).toEqual('failed')

    taskQueue = new TaskQueue('test', async () => {}, { retryAttempts: 1 })
    taskQueue.addTask(data)

    const task = Array.from(taskQueue['tasks'].values())[0]
    task.status = 'failed'

    await taskQueue.retryFailedTasks()
    expect(Array.from(taskQueue['tasks'].values())[0].status).toEqual('completed')
  })

  it('should clear completed tasks', async () => {
    const data = { foo: 'bar' }
    taskQueue.addTask(data)
    await taskQueue.runTasks()
    expect(taskQueue['tasks'].size).toBe(1)

    await taskQueue.clearCompletedTasks()
    expect(taskQueue['tasks'].size).toBe(0)
  })
})
