import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// POST /api/ai/chat - Context-aware student assistant
router.post('/chat', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  try {
    // 1. Fetch live academic context for this user
    const user = db.prepare('SELECT name, department, semester, program FROM users WHERE id = ?').get(req.user.id);
    const courses = db.prepare('SELECT code, name, credit, teacher, attendance_present, attendance_total FROM courses WHERE userId = ?').all(req.user.id);
    const tasks = db.prepare("SELECT title, courseName, deadline, priority, status FROM tasks WHERE userId = ? AND status != 'Completed'").all(req.user.id);
    const routine = db.prepare('SELECT day, time, course, room FROM routine WHERE userId = ?').all(req.user.id);
    const exams = db.prepare('SELECT title, courseCode, date, time, room FROM exams WHERE userId = ? ORDER BY date ASC').all(req.user.id);

    // 2. Build live context prompt
    const systemContext = `
You are StudentOS AI, a university assistant dedicated to helping ${user?.name || 'this student'}.
Student Academic Info:
- Department: ${user?.department || 'Software Engineering'}
- Semester: ${user?.semester || '1st Semester'}
- Program: ${user?.program || 'Undergraduate'}

Current Enrolled Courses:
${courses.map(c => `- ${c.code}:${c.name} (${c.credit} credits, Teacher:${c.teacher || 'TBA'}, Attendance: ${c.attendance_present}/${c.attendance_total})`).join('\n') || 'None'}

Pending Tasks & Assignments:
${tasks.map(t => `- [${t.priority}]${t.title} (${t.courseName}) due on${t.deadline}`).join('\n') || 'None'}

Upcoming Exams:
${exams.map(e => `- ${e.courseCode} ${e.title} on${e.date} at ${e.time} in${e.room}`).join('\n') || 'None'}

Weekly Routine / Classes:
${routine.map(r => `- ${r.day}:${r.course} at ${r.time} (${r.room})`).join('\n') || 'None'}

Instructions:
1. Provide accurate, helpful, and concise guidance based directly on the student's actual timetable, attendance risks (<75%), and pending assignments.
2. If calculating attendance or workload, reference their real numbers.
3. Keep the tone friendly, academic, and direct.
`;

    // 3. Request Gemini model response
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemContext}\n\nUser Question: ${prompt}` }] }
      ]
    });

    res.json({
      success: true,
      reply: response.text || "I couldn't process your request at this moment."
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, message: error.message || 'AI service failure' });
  }
});

export default router;