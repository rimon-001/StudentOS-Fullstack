import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/exams - Fetch all exams for authenticated user
router.get('/', requireAuth, (req, res) => {
  try {
    const exams = db.prepare('SELECT * FROM exams WHERE userId = ? ORDER BY date ASC, time ASC').all(req.user.id);
    res.json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/exams - Create a new exam
router.post('/', requireAuth, (req, res) => {
  const { title, courseCode, date, time, room, type } = req.body;
  if (!title || !courseCode) {
    return res.status(400).json({ success: false, message: 'Title and Course Code are required' });
  }

  const newExam = {
    id: 'ex_' + Date.now(),
    userId: req.user.id,
    title,
    courseCode,
    date: date || new Date().toISOString().split('T')[0],
    time: time || '10:00 AM - 12:00 PM',
    room: room || 'TBA',
    type: type || 'Midterm'
  };

  try {
    const stmt = db.prepare(`
      INSERT INTO exams (id, userId, title, courseCode, date, time, room, type)
      VALUES (@id, @userId, @title, @courseCode, @date, @time, @room, @type)
    `);
    stmt.run(newExam);

    res.status(201).json({ success: true, data: newExam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/exams/:id - Delete an exam ensuring user ownership
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM exams WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found or unauthorized' });
    }
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;