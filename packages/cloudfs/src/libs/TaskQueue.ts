import { IndexedDB } from '@/libs/IndexedDB'
import { Logger } from '@/libs/Logger'
import { TASK_QUEUE_DATABASE, TASK_QUEUE_DATABASE_VERSION, TASK_QUEUE_TASK_STORE_INDEXES, TASK_QUEUE_TASK_STORE_NAME } from '@/constants'
import type { Task } from '@/types'

export type TaskQueueExecutor<T = any> = (task: Task<T>) => Promise<void>

export interface TaskQueueOptions {
  maxTasks?: number
  retryAttempts?: number
}

export class TaskQueue<T = any> {
  protected db: IndexedDB
  protected tasks: Map<string, Task<T>>
  protected maxTasks: number
  protected retryAttempts: number
  protected execute: TaskQueueExecutor<T>
  protected execution: Promise<any>
  protected name: string
  protected logger: Logger

  constructor(name: string, execute: TaskQueueExecutor<T>, options?: TaskQueueOptions) {
    const { maxTasks = 10, retryAttempts = 3 } = options || {}
    this.name = name
    this.db = new IndexedDB({
      database: `${name}${TASK_QUEUE_DATABASE}`,
      version: TASK_QUEUE_DATABASE_VERSION,
      store: {
        [TASK_QUEUE_TASK_STORE_NAME]: {
          indexes: Array.from(
            (function* () {
              for (const name of TASK_QUEUE_TASK_STORE_INDEXES) {
                yield {
                  name,
                  keyPath: name,
                  options: { unique: false },
                }
              }
            })()
          ),
        },
      },
    })

    this.tasks = new Map<string, Task<T>>()
    this.maxTasks = maxTasks
    this.retryAttempts = retryAttempts
    this.execute = execute
    this.execution = Promise.resolve()
    this.logger = new Logger(name)
    this.init()
  }

  protected async init() {
    await this.pullTasks()
    await this.clearCompletedTasks()
  }

  protected async pullTasks() {
    const [store] = await this.db.getStore(TASK_QUEUE_TASK_STORE_NAME, 'readonly')
    const index = store.index('name')
    const request = index.getAll(IDBKeyRange.only(this.name))
    const tasks: Task<T>[] = await this.db.resolveRequest(request)

    for (const task of tasks) {
      if (this.tasks.has(task.id)) {
        continue
      }

      this.tasks.set(task.id, task)
    }
  }

  protected generateTaskId() {
    return (Date.now() + Math.floor(Math.random() * 1e13)).toString(35)
  }

  protected genereateTask(data: T): Task<T> {
    return {
      id: this.generateTaskId(),
      name: this.name,
      status: 'idle',
      data,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  public addTask(data: T) {
    const task = this.genereateTask(data)
    this.tasks.set(task.id, task)
    this.logger.debug(`Append task #${task.id}.`)

    this.runTasks()
  }

  public async runTasks() {
    const promise = this.execution.then(async () => {
      const tasksToRun = Array.from(this.tasks.values()).filter((task) => task.status === 'idle')
      if (tasksToRun.length === 0) {
        return
      }

      await this.executeTasks(tasksToRun)
    })

    this.execution = promise
    await promise
  }

  protected async executeTask(task: Task<T>) {
    this.logger.debug(`Task #${task.id} execution started.`)

    await this.markTaskAsPending(task)
    await this.execute(task).catch(async (error) => {
      this.logger.fail('Task execution fails.')

      if (!(task.retryCount < this.retryAttempts)) {
        return Promise.reject(error)
      }

      this.logger.debug(`Retrying failed task #${task.id}.`)
      task.retryCount++
      return this.executeTask(task)
    })

    await this.markTaskAsCompleted(task)

    this.logger.debug(`Task #${task.id} completed.`)
  }

  protected async executeTasks(tasks: Task<T>[]) {
    for (const task of tasks) {
      try {
        await this.executeTask(task)
      } catch (error) {
        await this.markTaskAsFailed(task)
      }
    }
  }

  public async retryFailedTasks() {
    const failedTasks = Array.from(this.tasks.values()).filter((task) => task.status === 'failed')
    for (const task of failedTasks) {
      if (task.retryCount < this.retryAttempts) {
        task.retryCount++
        this.tasks.set(task.id, { ...task, status: 'idle' })
      }
    }

    await this.runTasks()
  }

  public async clearCompletedTasks() {
    const completedTasks = Array.from(this.tasks.values()).filter((task) => task.status === 'completed')
    for (const task of completedTasks) {
      await this.deleteTask(task)
    }
  }

  protected async markTaskAsPending(task: Task<T>) {
    task.status = 'pending'
    task.updatedAt = new Date()
    await this.updateTask(task)
  }

  protected async markTaskAsCompleted(task: Task<T>) {
    task.status = 'completed'
    task.updatedAt = new Date()
    await this.updateTask(task)
  }

  protected async markTaskAsFailed(task: Task<T>) {
    task.status = 'failed'
    task.updatedAt = new Date()
    await this.updateTask(task)
  }

  protected async updateTask(task: Task<T>) {
    const [store] = await this.db.getStore(TASK_QUEUE_TASK_STORE_NAME, 'readwrite')
    await this.db.put(store, task, task.id)
  }

  protected async deleteTask(task: Task<T>) {
    const [store] = await this.db.getStore(TASK_QUEUE_TASK_STORE_NAME, 'readwrite')
    await this.db.delete(store, task.id)
    this.tasks.delete(task.id)
  }

  public async clear() {
    for (const task of this.tasks.values()) {
      await this.deleteTask(task)
    }
  }
}
