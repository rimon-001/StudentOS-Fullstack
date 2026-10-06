import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper to recalculate and persist course attendance tallies
function syncCourseAttendanceTally(userId, courseId, courseCode) {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN LOWER(status) = 'present' THEN 1 ELSE 0 END) as present
      FROM attendance
      WHERE userId = ? AND (courseId = ? OR courseCode = ?)
    `).get(userId, courseId || '', courseCode || '');

    const presentCount = stats ? (stats.present || 0) : 0;
    const totalCount = stats ? (stats.total || 0) : 0;

    db.prepare(`
      UPDATE courses 
      SET attendance_present = ?, attendance_total = ?
      WHERE userId = ? AND (id = ? OR code = ?)
    `).run(presentCount, totalCount, userId, courseId || '', courseCode || '');
  } catch (err) {
    console.warn('[Attendance Tally Sync Warning]:', err.message);
  }
}

// GET /api/attendance (Fetch user's attendance records)
router.get('/', requireAuth, (req, res) => {
  try {
    const records = db
      .prepare('SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC, rowid DESC')
      .all(req.user.id);

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/attendance (Log or update attendance and auto-sync course stats)
router.post('/', requireAuth, (req, res) => {
  const { courseId, courseCode, date, status } = req.body;
  if (!courseCode || !status) {
    return res.status(400).json({ success: false, message: 'courseCode and status are required' });
  }

  const logDate = date || new Date().toISOString().split('T')[0];
  const normalizedStatus = status.trim().toLowerCase() === 'present' ? 'Present' : 'Absent';
  const cId = courseId || 'c1';
  const cCode = courseCode.trim().toUpperCase();

  try {
    const saveTransaction = db.transaction(() => {
      // Check if attendance for this course on this date already exists
      const existing = db.prepare(`
        SELECT id FROM attendance 
        WHERE userId = ? AND (courseId = ? OR courseCode = ?) AND date = ?
      `).get(req.user.id, cId, cCode, logDate);

      let recordId = existing ? existing.id : 'att_' + Date.now();

      if (existing) {
        db.prepare(`
          UPDATE attendance 
          SET status = ?, courseId = ?, courseCode = ?
          WHERE id = ? AND userId = ?
        `).run(normalizedStatus, cId, cCode, recordId, req.user.id);
      } else {
        db.prepare(`
          INSERT INTO attendance (id, userId, courseId, courseCode, date, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(recordId, req.user.id, cId, cCode, logDate, normalizedStatus);
      }

      // Automatically sync course metrics
      syncCourseAttendanceTally(req.user.id, cId, cCode);

      return {
        id: recordId,
        userId: req.user.id,
        courseId: cId,
        courseCode: cCode,
        date: logDate,
        status: normalizedStatus
      };
    });

    const resultRecord = saveTransaction();
    res.status(201).json({ success: true, data: resultRecord });
  } catch (error) {
    console.error('Attendance recording error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/attendance/:id/toggle (Toggle Present <-> Absent)
router.patch('/:id/toggle', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    const record = db.prepare('SELECT * FROM attendance WHERE id = ? AND userId = ?').get(id, req.user.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found or access denied' });
    }

    const nextStatus = record.status.toLowerCase() === 'present' ? 'Absent' : 'Present';

    const toggleTransaction = db.transaction(() => {
      db.prepare('UPDATE attendance SET status = ? WHERE id = ? AND userId = ?').run(nextStatus, id, req.user.id);
      syncCourseAttendanceTally(req.user.id, record.courseId, record.courseCode);
    });

    toggleTransaction();

    res.json({ success: true, data: { ...record, status: nextStatus } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/attendance/:id (Delete attendance record and sync course totals)
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    const record = db.prepare('SELECT * FROM attendance WHERE id = ? AND userId = ?').get(id, req.user.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found or access denied' });
    }

    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM attendance WHERE id = ? AND userId = ?').run(id, req.user.id);
      syncCourseAttendanceTally(req.user.id, record.courseId, record.courseCode);
    });

    deleteTransaction();

    res.json({ success: true, message: 'Attendance record deleted and course tally updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;