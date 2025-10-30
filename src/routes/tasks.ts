import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
// import { SyncService } from '../services/syncService';
import { Database } from '../db/database';
import { z } from 'zod';
export const TaskSchema = z.object({
  id: z.string().uuid().optional(), 
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  completed: z.boolean().default(false),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  is_deleted: z.boolean().default(false),
  sync_status: z.enum(["pending", "synced", "error"]).optional(),
  server_id: z.string().optional(),
  last_synced_at: z.date().optional(),
});

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  // const syncService = new SyncService(db, taskService);

  // Get all tasks
  router.get('/', async (_req:Request,res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      return res.status(200).json(tasks);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json(task);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task
  router.post('/', async (req: Request, res: Response) => {
    // TODO: Implement task creation endpoint
    // 1. Validate request body
    // 2. Call taskService.createTask()
    // 3. Return created task
    const parsed =TaskSchema.safeParse(req.body);
    if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.errors,
    });
  }
  const body = parsed.data;
  try{
    const task = taskService.createTask(body);   
    res.status(201).json(task);
    return task;
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: 'something went wrong' });
  }
    
    
  });

  // Update task
  router.put('/:id', async (req: Request, res: Response) => {
    // TODO: Implement task update endpoint
    // 1. Validate request body
    // 2. Call taskService.updateTask()
    // 3. Handle not found case
    // 4. Return updated task
    const {id} = req.params;
    const body = TaskSchema.partial(req.body);
    try{
      const updating =await taskService.updateTask(id,body);
      if(!updating){
        return res.status(404).json({error:"Task not found"});
      }
      return res.status(200).json(updating);
    }catch(err){
      console.error(err);
      return res.status(500).json("Something went wrong");
    }
    // res.status(501).json({ error: 'Not implemented' });
  });

  // Delete task
  router.delete('/:id', async (req: Request, res: Response) => {
    // TODO: Implement task deletion endpoint
    // 1. Call taskService.deleteTask()
    // 2. Handle not found case
    // 3. Return success response
    const {id}=req.params;
    try{
      const deleting = await taskService.deleteTask(id);
      if(!deleting){
        return res.status(404).json({error:"task not found"});
      }
      return res.status(200).json("task deleted");
    }catch(err){
      console.error(err);
      return res.status(500).json("Something went wrong");
    }
    // res.status(501).json({ error: 'Not implemented'q });
  });

  return router;
}