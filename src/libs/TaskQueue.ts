import { IndexedDB } from '@/libs/IndexedDB'
import { TASK_QUEUE_DATABASE, TASK_QUEUE_DATABASE_VERSION, TASK_QUEUE_TASK_STORE_INDEXES, TASK_QUEUE_TASK_STORE_NAME } from '@/constants'
import { debug, fail } from '@/services/pretty'
import type { Task } from '@/types'

export type TaskQueueExecutor<T = any> = (task: Task<T>) => Promise<void>

export interface TaskQueueOptions {
  maxTasks?: number
  retryAttempts?: number
}

export class TaskQueue<T = any> {
  protected db
  protected tasks: Task<T>[]
  protected maxTasks
  protected retryAttempts
  protected execute
  protected execution
  protected name

  constructor(name: string, execute: TaskQueueExecutor<T>, options?: TaskQueueOptions) {
    const { maxTasks = 10, retryAttempts = 3 } = options || {}
    this.name = name
    this.db = new IndexedDB({
      database: TASK_QUEUE_DATABASE,
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

    this.tasks = []
    this.maxTasks = maxTasks
    this.retryAttempts = retryAttempts
    this.execute = execute
    this.execution = Promise.resolve()
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
    this.tasks.push(task)
    debug(`Append task ${task.id}.`, task.data)

    this.runTasks()
  }

  public async runTasks() {
    const tasksToRun = this.tasks.filter((task) => task.status === 'idle')
    if (tasksToRun.length === 0) {
      return
    }

    debug('Start executing task queue.')
    return this.execution.then(async () => {
      await this.executeTasks(tasksToRun)
      await this.runTasks()
    })
  }

  protected async executeTask(task: Task<T>) {
    debug('Task execution started.', task)

    await this.markTaskAsPending(task)
    await this.execute(task).catch(async (error) => {
      fail('Task execution fails.', task)

      if (!(task.retryCount < this.retryAttempts)) {
        return Promise.reject(error)
      }

      debug('Retrying failed task.', task)
      task.retryCount++
      return this.executeTask(task)
    })

    await this.markTaskAsCompleted(task)

    debug('Task completed.', task)
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
    const failedTasks = this.tasks.filter((task) => task.status === 'failed')
    for (const task of failedTasks) {
      if (task.retryCount < this.retryAttempts) {
        task.retryCount++
        this.tasks.push(task)
      }
    }

    await this.runTasks()
  }

  public async clearCompletedTasks() {
    const completedTasks = this.tasks.filter((task) => task.status === 'completed')
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
  }
}
