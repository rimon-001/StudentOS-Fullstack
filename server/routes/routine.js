import express from 'express';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Time slots corresponding to columns in university routine spreadsheets
const TIME_COLUMNS = {
  1: '08:30 AM - 10:00 AM', // Col B
  3: '10:00 AM - 11:30 AM', // Col D
  5: '11:30 AM - 01:00 PM', // Col F
  7: '01:00 PM - 02:30 PM', // Col H
  9: '02:30 PM - 04:00 PM', // Col J
  11: '04:00 PM - 05:30 PM' // Col L
};

// Known course names dictionary
const COURSE_NAMES = {
  'PHY 101': 'Physics I: Classical Mechanics & Waves',
  'PHY 102': 'Physics I Lab',
  'MAT 101': 'Mathematics I: Differential & Integral Calculus',
  'MAT 102': 'Mathematics II: Linear Algebra & Coordinate Geometry',
  'SE 111': 'Computer Fundamentals',
  'SE 112': 'Computer Fundamentals Lab',
  'SE 113': 'Introduction to Software Engineering',
  'SE 121': 'Structured Programming',
  'SE 122': 'Structured Programming Lab',
  'SE 123': 'Discrete Mathematics',
  'SE 131': 'Data Structure',
  'SE 132': 'Data Structure Lab',
  'SE 133': 'Software Development Project I',
  'SE 211': 'Object Oriented Concepts',
  'SE 212': 'Software Requirement Specification',
  'SE 213': 'Digital Electronics and Logic Design',
  'SE 214': 'Digital Electronics Lab',
  'SE 215': 'Algorithms',
  'SE 216': 'Algorithms Lab',
  'SE 221': 'Object Oriented Design',
  'SE 222': 'Object Oriented Design Lab',
  'SE 223': 'Database System',
  'SE 224': 'Database System Lab',
  'SE 225': 'Data Communication',
  'SE 226': 'Software Development Project II',
  'SE 231': 'Web Engineering',
  'SE 232': 'Operating System & System Programming',
  'SE 233': 'Operating System Lab',
  'SE 234': 'Computer Architecture',
  'SE 235': 'Theory of Computation',
  'SE 236': 'Software Engineering Project III',
  'BNS 101': 'Bangladesh Studies',
  'ENG 101': 'Basic Functional English',
  'AOL 101': 'Art of Living',
  'STA 101': 'Statistics',
};

function formatCourseCode(raw) {
  if (!raw) return '';
  const clean = raw.trim().toUpperCase().replace(/[\s\-_]/g, '');
  const match = clean.match(/^([A-Z]+)(\d+.*)$/);
  if (match) return `${match[1]} ${match[2]}`;
  return raw.trim().toUpperCase();
}

function getCourseName(code, isLab, labGroup) {
  const formatted = formatCourseCode(code);
  if (COURSE_NAMES[formatted]) return COURSE_NAMES[formatted];
  return isLab ? `Lab ${labGroup || ''} ${formatted}`.trim() : formatted;
}

// Synchronize course insertion into courses table
function syncCourseToDatabase(userId, code, name, teacher, room, semester = '1st Semester', isLab = false) {
  try {
    const cleanCode = formatCourseCode(code);
    const cleanName = name || cleanCode;
    const existing = db.prepare('SELECT id FROM courses WHERE userId = ? AND UPPER(code) = UPPER(?)').get(userId, cleanCode);
    
    if (!existing) {
      const courseId = `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const credits = isLab ? 1.5 : 3.0;
      
      db.prepare(`
        INSERT INTO courses (id, userId, code, name, credit, teacher, room, attendance_present, attendance_total, semester)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
      `).run(
        courseId,
        userId,
        cleanCode,
        cleanName,
        credits,
        teacher || 'Faculty',
        room || 'TBA',
        semester
      );
    }
  } catch (err) {
    console.warn('[Sync Course Warning]:', err.message);
  }
}

function parseRoutineExcelDirectly(buffer, targetBatch, targetSection, targetLab) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const dayRows = [];
  const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  for (let r = 0; r < data.length; r++) {
    const colA = String(data[r][0] || '').trim();
    const matchedDay = days.find((d) => d.toLowerCase() === colA.toLowerCase());
    if (matchedDay) dayRows.push({ day: matchedDay, rowIndex: r });
  }

  const batchStr = String(targetBatch || '').trim();
  const sectionStr = String(targetSection || '').trim().toUpperCase();
  const labStr = String(targetLab || '').trim().toUpperCase();

  const effectiveSection = sectionStr || (labStr.match(/^[A-Za-z]+/) ? labStr.match(/^[A-Za-z]+/)[0] : '');
  const labNum = labStr.replace(/\D/g, '') || (labStr.endsWith('1') ? '1' : labStr.endsWith('2') ? '2' : '');

  const extractedClasses = [];

  for (let i = 0; i < dayRows.length; i++) {
    const currentDay = dayRows[i].day;
    const startRow = dayRows[i].rowIndex + 1;
    const endRow = i + 1 < dayRows.length ? dayRows[i + 1].rowIndex : data.length;

    for (let r = startRow; r < endRow; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const room = String(row[0] || '').trim();
      if (!room || days.some((d) => d.toLowerCase() === room.toLowerCase()) || room.toLowerCase() === 'class') continue;

      for (const [colIdxStr, timeSlot] of Object.entries(TIME_COLUMNS)) {
        const colIdx = parseInt(colIdxStr, 10);
        const courseCell = String(row[colIdx] || '').trim();
        const teacherCell = String(row[colIdx + 1] || '').trim();

        if (!courseCell) continue;

        const parts = courseCell.split('-');
        if (parts.length < 2) continue;

        const cellCourseCode = parts[0].trim();
        const cellBatch = parts[1].trim();
        const cellSection = parts[2] ? parts[2].trim().toUpperCase() : '';

        if (batchStr && cellBatch && cellBatch !== batchStr) continue;
        if (effectiveSection && cellSection && !cellSection.startsWith(effectiveSection)) continue;

        const hasSectionNumber = /\d/.test(cellSection);
        const isLab = hasSectionNumber || cellCourseCode.toUpperCase().includes('LAB');

        if (isLab && labNum) {
          const cellLabNum = cellSection.replace(/\D/g, '');
          if (cellLabNum && cellLabNum !== labNum) continue;
        }

        extractedClasses.push({
          day: currentDay,
          code: formatCourseCode(cellCourseCode),
          name: getCourseName(cellCourseCode, isLab, cellSection),
          teacher: teacherCell || 'TBA',
          room: room.startsWith('Room') ? room : `Room ${room}`,
          time: timeSlot,
          isLab: isLab,
          labGroup: isLab ? cellSection : null,
        });
      }
    }
  }
  return extractedClasses;
}

// GET /api/routine - Fetch user's routine
router.get('/', requireAuth, (req, res) => {
  try {
    const routineSlots = db.prepare('SELECT * FROM routine WHERE userId = ? ORDER BY day, time ASC').all(req.user.id);
    return res.json({ success: true, routine: routineSlots, data: routineSlots });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/routine - Save routine permanently and automatically sync all modules
router.post('/', requireAuth, (req, res) => {
  try {
    const routineData = req.body || {};
    
    let slots = [];
    if (Array.isArray(routineData)) {
      slots = routineData;
    } else {
      Object.entries(routineData).forEach(([day, daySlots]) => {
        if (Array.isArray(daySlots)) {
          daySlots.forEach(slot => slots.push({ ...slot, day }));
        }
      });
    }

    const routineCols = db.prepare("PRAGMA table_info(routine)").all().map(c => c.name);
    const hasCodeCol = routineCols.includes('code');

    const saveRoutine = db.transaction((slotsToInsert) => {
      db.prepare('DELETE FROM routine WHERE userId = ?').run(req.user.id);
      
      const insertQuery = hasCodeCol
        ? `INSERT INTO routine (id, userId, day, time, code, name, room, teacher, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        : `INSERT INTO routine (id, userId, day, time, course, room, faculty) VALUES (?, ?, ?, ?, ?, ?, ?)`;

      const stmt = db.prepare(insertQuery);

      slotsToInsert.forEach(slot => {
        const id = slot.id || 'r_' + Date.now() + Math.floor(Math.random() * 1000);
        const day = slot.day || 'Monday';
        const time = slot.time || '08:30 AM - 10:00 AM';
        const code = formatCourseCode(slot.code || slot.course || 'COURSE');
        const name = slot.name || getCourseName(code, slot.isLab, slot.labGroup) || code;
        const room = slot.room || 'TBA';
        const teacher = slot.teacher || slot.faculty || 'Faculty';
        const color = slot.color || (slot.isLab ? 'emerald' : 'blue');

        if (hasCodeCol) {
          stmt.run(id, req.user.id, day, time, code, name, room, teacher, color);
        } else {
          stmt.run(id, req.user.id, day, time, code, room, teacher);
        }

        // Automatic full-website propagation: sync to courses table
        syncCourseToDatabase(req.user.id, code, name, teacher, room, '1st Semester', slot.isLab);
      });
    });

    saveRoutine(slots);
    return res.json({ success: true, message: 'Routine and all website modules synchronized!', routine: slots });
  } catch (error) {
    console.error('Routine save error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/routine/parse-file - Gemini AI OCR & Excel extraction
router.post('/parse-file', requireAuth, upload.single('file'), async (req, res) => {
  const { section, batch, labSection } = req.body;

  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const filename = (req.file.originalname || '').toLowerCase();
    const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv');

    if (isExcel) {
      const directSlots = parseRoutineExcelDirectly(req.file.buffer, batch, section, labSection);
      if (directSlots && directSlots.length > 0) {
        return res.json({ success: true, data: directSlots });
      }
    }

    let mimeType = req.file.mimetype;
    if (filename.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (filename.endsWith('.png')) mimeType = 'image/png';
    else mimeType = 'image/jpeg';

    const base64Data = req.file.buffer.toString('base64');
    const promptText = `
You are a university timetable reader. Extract all classes visible in this schedule matching:
- Batch: "${batch || 'any'}"
- Section: "${section || 'any'}"
- Lab Section: "${labSection || 'any'}"

Extraction Rules:
1. "day": Must be one of ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].
2. "code": Clean uppercase course code (e.g. "CSE 101", "SE 121", "MAT 101", "PHY 101", "BNS 101").
3. "name": Full descriptive course title if available or deduce from code.
4. "teacher": Teacher initials or name.
5. "room": Room identifier (e.g. "Room 701A" or "Lab 4").
6. "time": Scheduled interval (e.g. "08:30 AM - 10:00 AM").
7. "isLab": Boolean. True if it is a Lab or section has a number attached (e.g. F1, F2).
8. "labGroup": Group string (e.g. "F1", "F2") or null.
`;

    const contentsPayload = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: promptText },
        ],
      },
    ];

    // Priority sequence using models verified from your listModels output
    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest'
    ];

    let extractedData = null;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[OCR Processing] Attempting model: ${model}...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: contentsPayload,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  code: { type: Type.STRING },
                  name: { type: Type.STRING },
                  teacher: { type: Type.STRING },
                  room: { type: Type.STRING },
                  time: { type: Type.STRING },
                  isLab: { type: Type.BOOLEAN },
                  labGroup: { type: Type.STRING, nullable: true },
                },
                required: ['day', 'code', 'name', 'time', 'isLab'],
              },
            },
          },
        });

        if (response && response.text) {
          extractedData = JSON.parse(response.text);
          console.log(`✅ [OCR Success] Successfully parsed with model ${model}`);
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[OCR Notice] Model ${model} failed: ${err.message}`);
      }
    }

    if (!extractedData || extractedData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: lastError ? lastError.message : 'No classes found matching your section criteria.' 
      });
    }

    return res.json({ success: true, data: extractedData });
  } catch (error) {
    console.error('File parsing error:', error);
    return res.status(500).json({ success: false, message: error.message || 'File processing failed.' });
  }
});

export default router;