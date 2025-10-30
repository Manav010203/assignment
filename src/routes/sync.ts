import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';


export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Trigger manual sync
  router.post('/sync', async ( res: Response) => {
    // TODO: Implement sync endpoint
    // 1. Check connectivity first
    // 2. Call syncService.sync()
    // 3. Return sync result
    try{
    const connectivity =await syncService.checkConnectivity();
    if(!connectivity){
      return res.status(401).json("Unable to connect");
    }
    const sync =await syncService.sync();
    if(!sync){
      return res.status(401).json("sync error");
    }
    return sync;
  }catch(err){
    console.error(err);
    return res.status(500).json("something went wrong");
  }
    // res.status(501).json({ error: 'Not implemented' });
  });

  // Check sync status
  router.get('/status', async (_req: Request, res: Response) => {
    // TODO: Implement sync status endpoint
    // 1. Get pending sync count
    // 2. Get last sync timestamp
    // 3. Check connectivity
    // 4. Return status summary
    try{
    // const body = req.body;
   const pending = await db.get(
      `SELECT COUNT(*) as count FROM sync_queue`
    );
    const lastSync = await db.get(
      `SELECT MAX(last_synced_at) as last FROM tasks`
    );
    const connectivity = await syncService.checkConnectivity();
    if (!connectivity) {
      return res.status(503).json({ error: 'Unable to connect to server' });
    }
    return res.status(200).json({
      connectivity,
      pendingCount: pending?.count || 0,
      lastSyncedAt: lastSync?.last || null,
    })
    }catch(err){
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch sync status" });
    }
    // res.status(501).json({ error: 'Not implemented' });
  });

  // Batch sync endpoint (for server-side)
  router.post('/batch', async (req: Request, res: Response) => {
    // TODO: Implement batch sync endpoint
    // This would be implemented on the server side
    // to handle batch sync requests from clients
    try{const {items} =req.body;
    if(!Array.isArray(items) || items.length===0){
      return res.status(400).json({ error: "Invalid batch payload" });
    }
    const processed = await Promise.all(items.map(async(item:any)=>{
      try{
        if(item.operation==="create"){
          const created = await taskService.createTask(JSON.parse(item.data));
          return {
            client_id:item.client_id,
            server_id:created.id,
            status:"success"
          };
        }else if(item.operation==="update"){
          const updated = await taskService.updateTask(item.task_id,JSON.parse(item.data));
          return {
            client_id:item.client_id,
            server_id:updated?.id,
            status:"success",
          };
        }else if(item.operation==="delete"){
          await taskService.deleteTask(item.task_id);
          return{
            client_id:item.client_id,
            server_id:item.task_id,
            status:"success"
          };
        }else{
          return{
            client_id:item.client_id,
            server_id:"",
            status:"error",
            error:"Invalid operation"
          };
        }
      }catch(err:any){
        console.error(err);
        return{
          client_id:item.client_id,
            server_id:"",
            status:"error",
            error:err.message,
          };
      }
    })
  );
    return res.status(200).json({proccessed_item:processed});}
    catch(err){
      console.error(err);
      return res.status(500).json({error:"Batch processing failed"});
    }
  });

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    path: req.originalUrl,
  });
});

  return router;
}