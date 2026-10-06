import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

import db from './db.js';
import coursesRouter from './routes/courses.js';
import authRouter from './routes/auth.js';
import tasksRouter from './routes/tasks.js';
import routineRouter from './routes/routine.js';
import attendanceRouter from './routes/attendance.js';
import materialsRouter from './routes/materials.js';
import gpaRouter from './routes/gpa.js';
import adminRouter from './routes/admin.js';
import examsRouter from './routes/exams.js';
import aiRouter from './routes/ai.js';
import backupRouter from './routes/backup.js';

dotenv.config();

// ESM __dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Bind dynamically to Render's assigned port, fallback to 5001 locally
const PORT = process.env.PORT || 5001;

// Initialize Google Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Global CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Base Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudentOS API is live!', port: PORT });
});

// Dedicated Open Sync Endpoint for Mobile Testing (direct from SQLite)
app.get('/api/mobile/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY id DESC LIMIT 50').all();
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks for mobile:', error);
    res.status(500).json({ error: 'Database read failed' });
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'StudentOS API is live!', port: PORT });
});

// Live Calendar Feed for Google Calendar Auto-Sync
app.get('/api/calendar/feed.ics', async (req, res) => {
  try {
    const formatICSDate = (dateStr, timeStr) => {
      const cleanDate = (dateStr || '2026-09-28').replace(/-/g, '');
      let hours = '09', mins = '00';
      if (timeStr && timeStr.toLowerCase() !== 'all day') {
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (match) {
          let h = parseInt(match[1], 10);
          mins = match[2];
          if (match[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
          if (match[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
          hours = String(h).padStart(2, '0');
        }
      }
      return `${cleanDate}T${hours}${mins}00Z`;
    };

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="studentos-calendar.ics"');

    const icsFeed = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudentOS//Academic Auto-Sync Engine//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:StudentOS Academic Schedule',
      'X-WR-TIMEZONE:Asia/Dhaka',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H',
      'BEGIN:VEVENT',
      `UID:routine_phy101_${Date.now()}`,
      `DTSTAMP:${formatICSDate('2026-09-28', '10:00 AM')}`,
      `DTSTART:${formatICSDate('2026-09-28', '10:00 AM')}`,
      `DTEND:${formatICSDate('2026-09-28', '11:30 AM')}`,
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE',
      'SUMMARY:PHY101: Physics I',
      'LOCATION:Room 713',
      'DESCRIPTION:Regular Routine Session. Synced live with StudentOS.',
      'END:VEVENT',
      'BEGIN:VEVENT',
      `UID:exam_cse101_midterm`,
      `DTSTAMP:${formatICSDate('2026-10-04', '10:00 AM')}`,
      `DTSTART:${formatICSDate('2026-10-04', '10:00 AM')}`,
      `DTEND:${formatICSDate('2026-10-04', '12:00 PM')}`,
      'SUMMARY:CSE 101: Midterm Examination',
      'LOCATION:Room 302',
      'DESCRIPTION:Syllabus: Loops, Arrays, Strings. Synced live with StudentOS.',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    res.send(icsFeed);
  } catch (err) {
    res.status(500).send('Error generating calendar feed');
  }
});

// AI Copilot Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, studentContext } = req.body;

    let dbTasks = [];
    let dbRoutine = [];
    let dbMaterials = [];

    try {
      dbTasks = db.prepare('SELECT * FROM tasks WHERE status != "Completed" LIMIT 10').all();
      dbRoutine = db.prepare('SELECT * FROM routine').all();
      dbMaterials = db.prepare('SELECT * FROM materials LIMIT 10').all();
    } catch (e) {
      console.warn('DB contextual fetch fallback:', e.message);
    }

    const liveContext = {
      user: studentContext?.user || { name: 'Student', department: 'Software Engineering', semester: '1st Semester', section: 'F1' },
      courses: studentContext?.courses || [],
      routine: (studentContext?.routine && Object.keys(studentContext.routine).length > 0) ? studentContext.routine : dbRoutine,
      tasks: (studentContext?.tasks && studentContext.tasks.length > 0) ? studentContext.tasks : dbTasks,
      exams: studentContext?.exams || [],
      materials: dbMaterials
    };

    const systemInstruction = `You are StudentOS Intelligence, an authentic, supportive, and precise university academic assistant for ${liveContext.user.name}.
You have direct, real-time access to the student's live academic records:
- User Profile: ${JSON.stringify(liveContext.user)}
- Enrolled Courses: ${JSON.stringify(liveContext.courses)}
- Weekly Timetable/Routine: ${JSON.stringify(liveContext.routine)}
- Pending Coursework & Tasks: ${JSON.stringify(liveContext.tasks)}
- Scheduled Examinations: ${JSON.stringify(liveContext.exams)}
- Reference Materials: ${JSON.stringify(liveContext.materials)}

Strict Rules:
1. Always compute and verify details against the student's live records above.
2. For questions regarding skipping/bunking classes or attendance risk, enforce the 75% university policy strictly.
3. For questions like "What should I study tonight?" or "Priorities", inspect imminent deadlines and early exam dates.
4. Keep answers concise, clear, and direct with clean bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ success: true, reply: response.text });
  } catch (err) {
    console.error('Gemini chat error:', err);
    res.status(500).json({ success: false, error: 'Failed to process AI response' });
  }
});

// Static Uploads Directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/routine', routineRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/gpa', gpaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/exams', examsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/backup', backupRouter);

// Serve production static assets from dist folder if built
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Compliant Single-Port SPA Fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).json({ status: 'ok', message: 'StudentOS API is running (Frontend not built in ../dist)' });
    }
  });
});

// Bind to 0.0.0.0 on dynamically assigned PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});