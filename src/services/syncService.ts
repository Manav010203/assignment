import axios from 'axios';
import { Task, SyncQueueItem, SyncResult, BatchSyncResponse, SyncError } from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';
import { v4 as uuidv4 } from 'uuid';

export class SyncService {
  private apiUrl: string;
  
  constructor(
    private db: Database,
    //@ts-ignore
    private taskService: TaskService,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.apiUrl = apiUrl;
  }

  async sync(): Promise<SyncResult> {
    // TODO: Main sync orchestration method
    // 1. Get all items from sync queue
    // 2. Group items by batch (use SYNC_BATCH_SIZE from env)
    // 3. Process each batch
    // 4. Handle success/failure for each item
    // 5. Update sync status in database
    // 6. Return sync result summary
   
const SYNC_BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || "10", 10);

  const all_items = await this.db.all(`SELECT * FROM sync_queue`);

  if (!all_items || all_items.length === 0) {
    return {
      success: true,
      synced_items: 0,
      failed_items: 0,
      errors: [],
    };
  }

  const batches: SyncQueueItem[][] = [];
  for (let i = 0; i < all_items.length; i += SYNC_BATCH_SIZE) {
    batches.push(all_items.slice(i, i + SYNC_BATCH_SIZE));
  }

  let synced_items = 0;
  let failed_items = 0;
  const errors: SyncError[] = [];

  for (const batch of batches) {
    try {
      const result = await this.processBatch(batch);

      for (const processed of result.processed_items) {
        if (processed.status === "success") {
          synced_items++;
          await this.updateSyncStatus(processed.client_id, "synced", {
            id: processed.server_id,
            ...processed.resolved_data,
          });
        } else {
          failed_items++;
          errors.push({
            task_id: processed.client_id,
            operation: "update",
            error: processed.error || "Unknown sync error",
            timestamp: new Date(),
          });

          await this.updateSyncStatus(processed.client_id, "error");
        }
      }
    } catch (err: any) {
      failed_items += batch.length;

      for (const item of batch) {
        errors.push({
          task_id: item.task_id,
          operation: item.operation,
          error: err.message || "Batch sync failed",
          timestamp: new Date(),
        });

        await this.handleSyncError(item, err);
      }
    }
  }
  const success = failed_items === 0;

  return {
    success,
    synced_items,
    failed_items,
    errors,
  };

    // throw new Error('Not implemented');
  }

  async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', data: Partial<Task>): Promise<void> {
    // TODO: Add operation to sync queue
    // 1. Create sync queue item
    // 2. Store serialized task data
    // 3. Insert into sync_queue table
    const task = await this.db.get(`SELECT * FROM tasks WHERE id=?`,[taskId]);
    if(!task){
      return ;
    }
    const queueId = uuidv4();
    const serialized_data = JSON.stringify(data);
    await this.db.run(`INSERT INTO sync_queue (id,task_id,operation,data) VALUES(?,?,?,?)`,[
      queueId,
      taskId,
      operation,
      serialized_data
    ])
    
    // throw new Error('Not implemented');
  }

  private async processBatch(items: SyncQueueItem[]): Promise<BatchSyncResponse> {
    // TODO: Process a batch of sync items
    // 1. Prepare batch request
    // 2. Send to server
    // 3. Handle response
    // 4. Apply conflict resolution if needed
  try {
    const payload = items.map(item => ({
      client_id: item.id,
      task_id: item.task_id,
      operation: item.operation,
      data: item.data,
    }));

    const apiUrl = `${process.env.API_BASE_URL}/sync/batch`;

    const response = await axios.post<BatchSyncResponse>(apiUrl, { items: payload });
    const result = response.data;
    for (const processed of result.processed_items) {
      if (processed.status === "conflict" && processed.resolved_data) {
        const localTask = items.find(i => i.task_id === processed.server_id)?.data;
        const serverTask = processed.resolved_data;

        if (localTask && serverTask) {
           await this.resolveConflict(
            localTask as Task,
            serverTask
          );
        }
      }
    }

    return result;

  } catch (err: any) {
    console.error("Batch sync failed:", err.message || err);
    return {
      processed_items: items.map(item => ({
        client_id: item.id,
        server_id: "",
        status: "error",
        error: err.response?.data?.message || err.message || "Unknown error",
      })),
    };
  }
}

  private async resolveConflict(localTask: Task, serverTask: Task): Promise<Task> {
    // TODO: Implement last-write-wins conflict resolution
    // 1. Compare updated_at timestamps
    // 2. Return the more recent version
    // 3. Log conflict resolution decision
    try{
      const localUpdated = new Date(localTask.updated_at).getTime();
      const serverUpdated = new Date(localTask.updated_at).getTime();

      const most_recent  = localUpdated >= serverUpdated ? localTask:serverTask;

      console.log(`[Conflict] Task ${localTask.id} resolved using ${
        localUpdated >= serverUpdated ? "local" : "server"
      } version`);
      return most_recent;
    }catch(err){
      console.error("Conflict resolution failed:", err);
    return serverTask;
    }
    // throw new Error('Not implemented');
  }

  private async updateSyncStatus(taskId: string, status: 'synced' | 'error', serverData?: Partial<Task>): Promise<void> {
    // TODO: Update task sync status
    // 1. Update sync_status field
    // 2. Update server_id if provided
    // 3. Update last_synced_at timestamp
    // 4. Remove from sync queue if successful
    try{
       await this.db.run(
      `
      UPDATE tasks 
      SET 
        sync_status = ?, 
        server_id = COALESCE(?, server_id), 
        last_synced_at = CURRENT_TIMESTAMP 
      WHERE id = ?
      `,
      [status, serverData?.id ?? null, taskId]
    );
    if (status === "synced") {
      await this.db.run(`DELETE FROM sync_queue WHERE task_id = ?`, [taskId]);
    }
    console.log(
      `Sync status updated for task ${taskId}: ${status}${
        serverData?.id ? ` (server_id=${serverData.id})` : ""
      }`
    );
    }catch(err){
      console.error(err);
    }
    // throw new Error('Not implemented');
  }

  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    // TODO: Handle sync errors
    // 1. Increment retry count
    // 2. Store error message
    // 3. If retry count exceeds limit, mark as permanent failure
    try {
    const newRetryCount = item.retry_count + 1;
    const maxRetries = Number(process.env.SYNC_RETRY_ATTEMPTS) || 3;
    if (newRetryCount >= maxRetries) {
      await this.db.run(
        `
        UPDATE sync_queue 
        SET 
          retry_count = ?, 
          error_message = ?, 
          sync_status = 'failed'
        WHERE id = ?
        `,
        [newRetryCount, error.message, item.id]
      );

      console.warn(
        `Sync permanently failed for item ${item.id}: ${error.message}`
      );
      return;
    }
    await this.db.run(
      `
      UPDATE sync_queue 
      SET 
        retry_count = ?, 
        error_message = ?
      WHERE id = ?
      `,
      [newRetryCount, error.message, item.id]
    );

    console.log(
      `Sync error for item ${item.id} (retry ${newRetryCount}/${maxRetries}): ${error.message}`
    );
  } catch (err) {
    console.error(`Failed to handle sync error for item ${item.id}:`, err);
  }

    // throw new Error('Not implemented');
  }

  async checkConnectivity(): Promise<boolean> {
    // TODO: Check if server is reachable
    // 1. Make a simple health check request
    // 2. Return true if successful, false otherwise
   try {
    const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
    if(!response){
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Server unreachable:", (err as Error).message);
    return false;
  }
  }
}