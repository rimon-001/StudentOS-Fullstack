import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/courses (Fetch only the logged-in user's courses)
router.get('/', requireAuth, (req, res) => {
  try {
    const courses = db.prepare('SELECT * FROM courses WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id);
    
    // Format database rows back into the exact structure the React frontend expects
    const formattedCourses = courses.map(c => ({
      ...c,
      credits: c.credit, // map DB column to frontend prop
      isLab: Boolean(c.isLab),
      attendance: {
        present: c.attendance_present || 0,
        total: c.attendance_total || 0
      }
    }));

    res.json({ success: true, data: formattedCourses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/courses (Create a course linked to the user)
router.post('/', requireAuth, (req, res) => {
  const { id, code, name, teacher, credits, room, color, semester, attendance, isLab } = req.body;
  
  try {
    const stmt = db.prepare(`
      INSERT INTO courses (id, userId, code, name, credit, semester, color, teacher, room, isLab, attendance_present, attendance_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const courseId = id || 'c_' + Date.now();
    const att = attendance || { present: 0, total: 0 };
    
    stmt.run(
      courseId,
      req.user.id, // Securely injected from auth token
      code,
      name,
      credits || 3.0,
      semester || '1st Semester',
      color || '#3B82F6',
      teacher || 'TBA',
      room || '',
      isLab ? 1 : 0,
      att.present || 0,
      att.total || 0
    );
    
    res.json({ success: true, course: { ...req.body, id: courseId } });
  } catch (error) {
    console.error('Course insert error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/courses/:id (Update a course, verifying ownership)
router.put('/:id', requireAuth, (req, res) => {
  const { code, name, teacher, credits, room, color, semester, attendance, isLab } = req.body;
  const { id } = req.params;
  
  try {
    const stmt = db.prepare(`
      UPDATE courses 
      SET code = ?, name = ?, teacher = ?, credit = ?, room = ?, color = ?, semester = ?, isLab = ?, attendance_present = ?, attendance_total = ?
      WHERE id = ? AND userId = ?
    `);
    
    const att = attendance || { present: 0, total: 0 };
    
    const result = stmt.run(
      code, name, teacher, credits, room, color, semester, 
      isLab ? 1 : 0, att.present || 0, att.total || 0,
      id, req.user.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Course not found or access denied.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Course update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/courses/:id (Delete a course, verifying ownership)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM courses WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Course not found or access denied.' });
    }
    
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;