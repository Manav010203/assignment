import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';

export class TaskService {
  constructor(private db: Database) {}

  async createTask(taskData: Partial<Task>): Promise<Task> {
    // TODO: Implement task creation
    // 1. Generate UUID for the task
    // 2. Set default values (completed: false, is_deleted: false)
    // 3. Set sync_status to 'pending'
    // 4. Insert into database
    // 5. Add to sync queue
    const uuid = uuidv4();
    const completed=false;
    const is_deleted=false;
    const sync_status="pending";
    const task:Task = {
      id:uuid,
      title: taskData.title||"",
      description: taskData.description||"",
      completed:completed,
      created_at:taskData.created_at || new Date(),
      updated_at:taskData.updated_at || new Date(),
      is_deleted:is_deleted,
      sync_status:sync_status,
      server_id:taskData.server_id,
      last_synced_at:taskData.last_synced_at
    }
    await this.db.run(`INSERT INTO tasks(
      id, title, description, completed, created_at, updated_at,
        is_deleted, sync_status, server_id, last_synced_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,[
          task.id,
          task.title,
          task.description,
          task.completed,
          task.created_at,
          task.updated_at,
          task.is_deleted,
          task.sync_status,
          task.server_id,
          task.last_synced_at
        ])
    const queueId = uuidv4();
    const op = "create";
    const data = JSON.stringify(task);


    await this.db.run(`INSERT INTO sync_queue(
      id,task_id,operation,data) VALUES(?,?,?,?)`,[
        queueId,
        uuid,
        op,
        data
      ])

      return task;
    throw new Error('Not implemented');
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // TODO: Implement task update
    // 1. Check if task exists
    // 2. Update task in database
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue
    const existing_task = await this.db.get(`SELECT * FROM tasks WHERE id = ?`,[id]);
    if(!existing_task){
      return null;
    }
    const updated_at = new Date().toISOString();
    const sync_status="pending";
    const updatedValues = {
      ...existing_task,
      ...updates,
      updated_at,
      sync_status
  }

    await this.db.run(`UPDATE tasks SET title=?, description=?, completed=?, is_deleted=?, updated_at=?, sync_status=? WHERE id=?`,[
      updatedValues.title,
      updatedValues.description,
      updatedValues.completed,
      updatedValues.is_deleted,
      updatedValues.updated_at,
      updatedValues.sync_status,
      id
    ])

    const queueId = uuidv4();
    const op = "update";
    const data = JSON.stringify(updatedValues);

    await this.db.run(`INSERT INTO sync_queue(
      id,task_id,operation,data)
      VALUES(?,?,?,?)`,[
        queueId,
        id,
        op,
        data
      ])
      return updatedValues;
    throw new Error('Not implemented');
  }

  async deleteTask(id: string): Promise<boolean> {
    // TODO: Implement soft delete
    // 1. Check if task exists
    // 2. Set is_deleted to true
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue
    const existing_task = await this.db.get(`SELECT * FROM tasks WHERE id=?`,[id]);
    if(!existing_task){
      return false;
    }
    const is_deleted=true;
    const sync_status="pending";
    const updated_at = new Date().toISOString();
    const deleteTask = {
      ...existing_task,
      is_deleted,
      sync_status,
      updated_at
    }
    await this.db.run(`UPDATE tasks SET is_deleted=?, updated_at=?, sync_status=? WHERE id=?`,[
      deleteTask.is_deleted,
      deleteTask.updated_at,
      deleteTask.sync_status,
      deleteTask.id
    ])

    const queueID = uuidv4();
    const op = "delete";
    const data = JSON.stringify(deleteTask);
    await this.db.run(`INSERT INTO sync_queue (id,task_id,operation,data) VALUES(?,?,?,?)`,[
      queueID,
      id,
      op,
      data
    ])
    return true;
    throw new Error('Not implemented');
  }

  async getTask(id: string): Promise<Task | null> {
    // TODO: Implement get single task
    // 1. Query database for task by id
    // 2. Return null if not found or is_deleted is true
    const task = await this.db.get(`SELECT * FROM tasks WHERE id=?`,[id])
    if(!task){
      return null;
    }
    return task;
    throw new Error('Not implemented');
  }

  async getAllTasks(): Promise<Task[]> {
    // TODO: Implement get all non-deleted tasks
    // 1. Query database for all tasks where is_deleted = false
    // 2. Return array of tasks
    const all_deleted_tasks = await this.db.all(`SELECT * FROM tasks WHERE is_deleted=?`,[false]);
    if(!all_deleted_tasks){
      return [];
    }
    return all_deleted_tasks;
    throw new Error('Not implemented');
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    // TODO: Get all tasks with sync_status = 'pending' or 'error'
    const sync_all_tasks = await this.db.all(`SELECT * FROM tasks WHERE sync_status IN ("pending","error")`);
    if(!sync_all_tasks){
      return [];
    }
    return sync_all_tasks;
    throw new Error('Not implemented');
  }
}