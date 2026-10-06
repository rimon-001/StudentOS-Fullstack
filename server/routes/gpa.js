import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/gpa (Fetch only the authenticated student's semester records and calculate live CGPA)
router.get('/', requireAuth, (req, res) => {
  try {
    const semesters = db
      .prepare('SELECT * FROM semesters WHERE userId = ? ORDER BY rowid ASC')
      .all(req.user.id);

    const getCoursesStmt = db.prepare(
      'SELECT * FROM semester_courses WHERE semesterId = ? AND userId = ?'
    );

    const populatedSemesters = semesters.map((sem) => {
      const courses = getCoursesStmt.all(sem.id, req.user.id);
      return {
        ...sem,
        courses,
      };
    });

    const totalCredits = populatedSemesters.reduce((acc, sem) => acc + (Number(sem.creditsCompleted) || 0), 0);
    const totalPoints = populatedSemesters.reduce((acc, sem) => acc + (Number(sem.sgpa) || 0) * (Number(sem.creditsCompleted) || 0), 0);
    const cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0.0;

    res.json({
      success: true,
      data: {
        cgpa,
        totalCredits,
        semesters: populatedSemesters,
      },
    });
  } catch (error) {
    console.error('GPA fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Handler function for saving/updating semester records
const handleSaveSemester = (req, res) => {
  const { semester, courses } = req.body;
  if (!semester || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ success: false, message: 'Semester name and course list are required' });
  }

  const creditsCompleted = courses.reduce((sum, c) => sum + (Number(c.credit || c.credits) || 0), 0);
  const points = courses.reduce(
    (sum, c) => sum + (Number(c.credit || c.credits) || 0) * (Number(c.gpa) || 0),
    0
  );
  const sgpa = creditsCompleted > 0 ? parseFloat((points / creditsCompleted).toFixed(2)) : 0.0;

  try {
    const saveTransaction = db.transaction(() => {
      // Check if semester already exists for this specific user
      const existing = db
        .prepare('SELECT id FROM semesters WHERE userId = ? AND LOWER(semester) = ?')
        .get(req.user.id, semester.trim().toLowerCase());

      const semesterId = existing ? existing.id : 'sem_' + Date.now();

      if (existing) {
        db.prepare(`
          UPDATE semesters 
          SET sgpa = ?, creditsCompleted = ?
          WHERE id = ? AND userId = ?
        `).run(sgpa, creditsCompleted, semesterId, req.user.id);

        // Clear existing courses for this semester to refresh cleanly
        db.prepare('DELETE FROM semester_courses WHERE semesterId = ? AND userId = ?').run(semesterId, req.user.id);
      } else {
        db.prepare(`
          INSERT INTO semesters (id, userId, semester, sgpa, creditsCompleted)
          VALUES (?, ?, ?, ?, ?)
        `).run(semesterId, req.user.id, semester.trim(), sgpa, creditsCompleted);
      }

      // Insert fresh course entries linked to the user
      const insertCourse = db.prepare(`
        INSERT INTO semester_courses (id, userId, semesterId, code, title, credit, grade, gpa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const c of courses) {
        insertCourse.run(
          c.id || 'sc_' + Math.random().toString(36).substr(2, 9),
          req.user.id,
          semesterId,
          c.code || '',
          c.title || c.name || '',
          Number(c.credit || c.credits) || 0,
          c.grade || 'N/A',
          Number(c.gpa) || 0
        );
      }

      return semesterId;
    });

    const savedId = saveTransaction();

    res.status(201).json({
      success: true,
      data: {
        id: savedId,
        semester: semester.trim(),
        sgpa,
        creditsCompleted,
        courses,
      },
    });
  } catch (error) {
    console.error('Semester save error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/gpa/semester & POST /api/gpa/save-semester
router.post('/semester', requireAuth, handleSaveSemester);
router.post('/save-semester', requireAuth, handleSaveSemester);

export default router;