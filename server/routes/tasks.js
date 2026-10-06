import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/tasks (Only fetch tasks belonging to the logged-in user)
router.get('/', requireAuth, (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY rowid DESC').all(req.user.id);
  res.json({ success: true, data: tasks });
});

// POST /api/tasks (Securely attach the new task to the logged-in user)
router.post('/', requireAuth, (req, res) => {
  const { title, courseId, courseName, deadline, priority, description } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  const newTask = {
    id: 't_' + Date.now(),
    userId: req.user.id, // Lock this task to the authenticated user
    title,
    courseId: courseId || 'c1',
    courseName: courseName || 'General',
    deadline: deadline || new Date().toISOString().split('T')[0],
    priority: priority || 'Medium',
    status: 'Pending',
    description: description || ''
  };

  const insert = db.prepare(`
    INSERT INTO tasks (id, userId, title, courseId, courseName, deadline, priority, status, description)
    VALUES (@id, @userId, @title, @courseId, @courseName, @deadline, @priority, @status, @description)
  `);
  insert.run(newTask);

  res.status(201).json({ success: true, data: newTask });
});

// PATCH /api/tasks/:id/toggle (Verify ownership before toggling status)
router.patch('/:id/toggle', requireAuth, (req, res) => {
  const { id } = req.params;
  
  // Check if task exists AND belongs to the user
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND userId = ?').get(id, req.user.id);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found or access denied' });

  const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
  db.prepare('UPDATE tasks SET status = ? WHERE id = ? AND userId = ?').run(nextStatus, id, req.user.id);

  res.json({ success: true, data: { ...task, status: nextStatus } });
});

// DELETE /api/tasks/:id (Verify ownership before deletion)
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND userId = ?').run(id, req.user.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: 'Task not found or access denied' });
  }
  
  res.json({ success: true, message: 'Task deleted successfully' });
});

export default router;