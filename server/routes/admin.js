import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Middleware: Verify user is an Admin
const requireAdmin = (req, res, next) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.role.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Administrative privileges required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/stats - Live telemetry across SQLite database
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE UPPER(role) = 'STUDENT'").get().count;
    const totalFaculty = db.prepare("SELECT COUNT(*) as count FROM users WHERE UPPER(role) IN ('TEACHER', 'FACULTY')").get().count;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Active'").get().count;
    const totalCourses = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalFaculty,
        activeUsers,
        totalCourses,
        serverUptime: `${Math.floor(process.uptime() / 60)} minutes`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/users - Return all registered students and accounts
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, role, status, studentId, department, program, semester, section 
      FROM users 
      ORDER BY rowid DESC
    `).all();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/users - Create new student directly in SQLite
router.post('/users', requireAuth, requireAdmin, (req, res) => {
  const { name, email, department, studentId, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const newId = 'u_' + Date.now();
    const hashedPassword = bcrypt.hashSync(password || 'password123', 10);
    const sId = studentId || String(Math.floor(10000 + Math.random() * 90000));

    db.prepare(`
      INSERT INTO users (id, name, email, password, role, status, department, studentId, semester, section)
      VALUES (?, ?, ?, ?, 'STUDENT', 'Active', ?, ?, '1st Semester', 'F1')
    `).run(newId, name.trim(), email.trim().toLowerCase(), hashedPassword, department || 'Software Engineering', sId);

    res.status(201).json({
      success: true,
      data: {
        id: newId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        department: department || 'Software Engineering',
        studentId: sId,
        status: 'Active'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/users/:id/status - Toggle Active / Suspended
router.patch('/users/:id/status', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(nextStatus, id);

    res.json({ success: true, data: { ...user, status: nextStatus } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/users/:id - Delete student
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User removed from registry' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;