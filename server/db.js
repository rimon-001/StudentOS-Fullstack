import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const provider = process.env.DB_PROVIDER || 'sqlite';
let dbInstance = null;

if (provider === 'mongodb') {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/studentos';
  mongoose.connect(mongoUri)
    .then(() => console.log('[Database] Connected to MongoDB successfully.'))
    .catch((err) => console.error('[Database] MongoDB connection error:', err));
  
  dbInstance = mongoose;
} else {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Exact database file
  const db = new Database(path.join(__dirname, 'studentos.sqlite'));

  // WAL mode for faster concurrent reads & writes
  db.pragma('journal_mode = WAL');

  // Initialize Core Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      status TEXT DEFAULT 'Active',
      enrolledCourses INTEGER DEFAULT 0,
      studentId TEXT,
      university TEXT,
      department TEXT,
      program TEXT,
      semester TEXT,
      section TEXT,
      academicSession TEXT DEFAULT 'Fall 2026',
      phone TEXT,
      bloodGroup TEXT,
      bio TEXT,
      skills TEXT,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      userId TEXT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      credit REAL DEFAULT 3.0,
      semester TEXT,
      color TEXT,
      teacher TEXT,
      room TEXT,
      isLab INTEGER DEFAULT 0,
      attendance_present INTEGER DEFAULT 0,
      attendance_total INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      userId TEXT,
      title TEXT NOT NULL,
      courseId TEXT,
      courseName TEXT,
      deadline TEXT,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      description TEXT,
      subtasks TEXT
    );

    CREATE TABLE IF NOT EXISTS routine (
      id TEXT PRIMARY KEY,
      userId TEXT,
      day TEXT NOT NULL,
      time TEXT NOT NULL,
      course TEXT NOT NULL,
      room TEXT,
      faculty TEXT
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      userId TEXT,
      courseId TEXT,
      courseCode TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      userId TEXT,
      courseId TEXT,
      courseCode TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'PDF',
      size TEXT DEFAULT '1.0 MB',
      uploadDate TEXT NOT NULL,
      url TEXT DEFAULT '#'
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      userId TEXT,
      semester TEXT NOT NULL,
      sgpa REAL NOT NULL,
      creditsCompleted REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS semester_courses (
      id TEXT PRIMARY KEY,
      userId TEXT,
      semesterId TEXT NOT NULL,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      credit REAL NOT NULL,
      grade TEXT NOT NULL,
      gpa REAL NOT NULL,
      FOREIGN KEY (semesterId) REFERENCES semesters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      userId TEXT,
      title TEXT NOT NULL,
      courseCode TEXT,
      date TEXT,
      time TEXT,
      room TEXT,
      type TEXT DEFAULT 'Midterm'
    );
  `);

  // ==========================================
  // 1. AUTO-REPAIR EVERY MISSING COLUMN IN USERS
  // ==========================================
  try {
    const userCols = db.pragma('table_info(users)').map(c => c.name);
    const requiredUserCols = [
      { name: 'role', type: 'TEXT DEFAULT "STUDENT"' },
      { name: 'status', type: 'TEXT DEFAULT "Active"' },
      { name: 'enrolledCourses', type: 'INTEGER DEFAULT 0' },
      { name: 'studentId', type: 'TEXT' },
      { name: 'university', type: 'TEXT' },
      { name: 'department', type: 'TEXT' },
      { name: 'program', type: 'TEXT' },
      { name: 'semester', type: 'TEXT' },
      { name: 'section', type: 'TEXT' },
      { name: 'academicSession', type: 'TEXT DEFAULT "Fall 2026"' },
      { name: 'phone', type: 'TEXT' },
      { name: 'bloodGroup', type: 'TEXT' },
      { name: 'bio', type: 'TEXT' },
      { name: 'skills', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' }
    ];

    for (const col of requiredUserCols) {
      if (!userCols.includes(col.name)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
        console.log(`[Auto-Repair] Added missing column '${col.name}' to users table.`);
      }
    }
  } catch (e) {
    console.warn('[Auto-Repair Users Error]:', e.message);
  }

  // ==========================================
  // 2. ENSURE userId EXISTS ON ALL DATA TABLES
  // ==========================================
  const tablesToVerify = ['courses', 'tasks', 'routine', 'attendance', 'materials', 'semesters', 'semester_courses', 'exams'];
  for (const table of tablesToVerify) {
    try {
      const existingCols = db.pragma(`table_info(${table})`).map(c => c.name);
      if (!existingCols.includes('userId')) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN userId TEXT;`);
        db.prepare(`UPDATE ${table} SET userId = 'u1' WHERE userId IS NULL`).run();
        console.log(`[Auto-Repair] Added userId column to ${table}.`);
      }
    } catch (e) {
      // Safe skip
    }
  }

  // ==========================================
  // 3. SEED DEFAULT USER IF TABLE IS EMPTY
  // ==========================================
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const defaultHash = bcrypt.hashSync('password123', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, name, email, password, role, status, enrolledCourses,
        studentId, university, department, program, semester, section, academicSession
      ) VALUES (
        @id, @name, @email, @password, @role, @status, @enrolledCourses,
        @studentId, @university, @department, @program, @semester, @section, @academicSession
      )
    `);

    insertUser.run({ 
      id: 'u1', 
      name: 'Md. Jahid Hasan Rimon', 
      email: 'rimon@student.os', 
      password: defaultHash, 
      role: 'STUDENT', 
      status: 'Active', 
      enrolledCourses: 5,
      studentId: '262-35-658',
      university: 'Daffodil International University',
      department: 'Software Engineering',
      program: 'Undergraduate (B.Sc.)',
      semester: '1st Semester',
      section: 'F1',
      academicSession: 'Fall 2026'
    });
  }

  // ==========================================
  // 4. SEED INITIAL COURSES IF TABLE IS EMPTY
  // ==========================================
  const courseCount = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
  if (courseCount === 0) {
    const insertCourse = db.prepare(`
      INSERT INTO courses (id, userId, code, name, credit, semester, color, teacher, room, isLab, attendance_present, attendance_total)
      VALUES (@id, @userId, @code, @name, @credit, @semester, @color, @teacher, @room, @isLab, @attendance_present, @attendance_total)
    `);

    const initialCourses = [
      { id: 'c_cse101', userId: 'u1', code: 'CSE 101', name: 'C Programming', credit: 3.0, semester: '1st Semester', color: '#3B82F6', teacher: 'Dr. Rahman', room: 'Room 302', isLab: 0, attendance_present: 1, attendance_total: 1 },
      { id: 'c_math101', userId: 'u1', code: 'MATH 101', name: 'Linear Algebra & Calculus', credit: 3.0, semester: '1st Semester', color: '#F59E0B', teacher: 'Prof. Karim', room: 'Room 201', isLab: 0, attendance_present: 0, attendance_total: 1 },
      { id: 'c_se101', userId: 'u1', code: 'SE 101', name: 'Software Engineering Fundamentals', credit: 3.0, semester: '1st Semester', color: '#10B981', teacher: 'Ms. Sultana', room: 'Room 305', isLab: 0, attendance_present: 1, attendance_total: 1 },
      { id: 'c_phy101', userId: 'u1', code: 'PHY101', name: 'Physics I', credit: 3.0, semester: '1st Semester', color: '#8B5CF6', teacher: 'Dr. Hasan', room: 'Room 713', isLab: 0, attendance_present: 1, attendance_total: 1 },
      { id: 'c_se122', userId: 'u1', code: 'SE122', name: 'Structured Programming Lab', credit: 1.5, semester: '1st Semester', color: '#059669', teacher: 'Engr. Shuvo', room: 'Lab 4', isLab: 1, attendance_present: 1, attendance_total: 1 }
    ];

    for (const c of initialCourses) {
      insertCourse.run(c);
    }
  }

  dbInstance = db;
  console.log('[Database] Connected to SQLite (studentos.sqlite) successfully.');
}

export default dbInstance;