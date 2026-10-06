import bcrypt from 'bcryptjs';
import db from './db.js';

console.log('🌱 Starting StudentOS Database Seeder...');

// 1. Ensure clean tables if requested
const clearExisting = process.argv.includes('--fresh');
if (clearExisting) {
  console.log('🧹 Purging existing table rows...');
  try { db.prepare('DELETE FROM routine').run(); } catch (e) {}
  try { db.prepare('DELETE FROM tasks').run(); } catch (e) {}
  try { db.prepare('DELETE FROM exams').run(); } catch (e) {}
  try { db.prepare('DELETE FROM courses').run(); } catch (e) {}
  try { db.prepare('DELETE FROM materials').run(); } catch (e) {}
  try { db.prepare("DELETE FROM users WHERE email != 'admin@student.os'").run(); } catch (e) {}
}

// 2. Default Seed User (Rimon)
const defaultUserId = 'u_rimon_seed';
const hashedPw = bcrypt.hashSync('password123', 10);

db.prepare(`
  INSERT OR REPLACE INTO users (id, name, email, password, role, status, studentId, department, program, semester, section)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  defaultUserId,
  'Md. Jahid Hasan Rimon',
  'rimon@student.os',
  hashedPw,
  'STUDENT',
  'Active',
  '262-35-658',
  'Software Engineering',
  'Undergraduate (B.Sc.)',
  '1st Semester',
  'F1'
);

console.log('✅ Student account seeded: rimon@student.os (password: password123)');

// 3. Seed Enrolled Courses
const courses = [
  { id: 'c_cse101', code: 'CSE 101', name: 'Structured Programming Language', credit: 3.0, teacher: 'Dr. Anwar Hossain', room: 'Room 701A', attP: 18, attT: 20 },
  { id: 'c_cse102', code: 'CSE 102', name: 'Structured Programming Lab', credit: 1.5, teacher: 'Dr. Anwar Hossain', room: 'Lab 4', attP: 9, attT: 10 },
  { id: 'c_mat101', code: 'MAT 101', name: 'Mathematics I: Differential & Integral Calculus', credit: 3.0, teacher: 'Prof. Nasreen Sultana', room: 'Room 602', attP: 19, attT: 20 },
  { id: 'c_phy101', code: 'PHY 101', name: 'Physics I: Classical Mechanics & Waves', credit: 3.0, teacher: 'Dr. Kazi M. Rahman', room: 'Room 713', attP: 16, attT: 20 },
  { id: 'c_eng101', code: 'ENG 101', name: 'Basic Functional English', credit: 3.0, teacher: 'Ms. Farhana Haque', room: 'Room 504', attP: 17, attT: 20 }
];

try {
  const insertCourse = db.prepare(`
    INSERT OR REPLACE INTO courses (id, userId, code, name, credit, teacher, room, attendance_present, attendance_total, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '1st Semester')
  `);
  courses.forEach((c) => {
    insertCourse.run(c.id, defaultUserId, c.code, c.name, c.credit, c.teacher, c.room, c.attP, c.attT);
  });
  console.log(`✅ Seeded ${courses.length} academic courses.`);
} catch (err) {
  console.warn('Courses seed note:', err.message);
}

// 4. Seed Weekly Routine (Section F1)
const routineSessions = [
  { day: 'Sunday', time: '08:30 - 10:00 AM', code: 'CSE 101', name: 'Structured Programming Language', room: 'Room 701A', teacher: 'Dr. Anwar Hossain', color: 'blue' },
  { day: 'Sunday', time: '10:00 - 11:30 AM', code: 'MAT 101', name: 'Mathematics I: Calculus', room: 'Room 602', teacher: 'Prof. Nasreen Sultana', color: 'emerald' },
  { day: 'Monday', time: '10:00 - 11:30 AM', code: 'PHY 101', name: 'Physics I: Classical Mechanics', room: 'Room 713', teacher: 'Dr. Kazi M. Rahman', color: 'purple' },
  { day: 'Monday', time: '11:30 - 01:00 PM', code: 'ENG 101', name: 'Basic Functional English', room: 'Room 504', teacher: 'Ms. Farhana Haque', color: 'amber' },
  { day: 'Tuesday', time: '08:30 - 11:30 AM', code: 'CSE 102', name: 'Structured Programming Lab', room: 'Lab 4', teacher: 'Dr. Anwar Hossain', color: 'indigo' },
  { day: 'Wednesday', time: '10:00 - 11:30 AM', code: 'PHY 101', name: 'Physics I: Classical Mechanics', room: 'Room 713', teacher: 'Dr. Kazi M. Rahman', color: 'purple' },
  { day: 'Wednesday', time: '11:30 - 01:00 PM', code: 'CSE 101', name: 'Structured Programming Language', room: 'Room 701A', teacher: 'Dr. Anwar Hossain', color: 'blue' },
  { day: 'Thursday', time: '10:00 - 11:30 AM', code: 'MAT 101', name: 'Mathematics I: Calculus', room: 'Room 602', teacher: 'Prof. Nasreen Sultana', color: 'emerald' }
];

try {
  const insertRoutine = db.prepare(`
    INSERT OR REPLACE INTO routine (id, userId, day, time, code, name, room, teacher, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  routineSessions.forEach((r, idx) => {
    insertRoutine.run(
      `r_${idx + 1}`,
      defaultUserId,
      r.day,
      r.time,
      r.code,
      r.name,
      r.room,
      r.teacher,
      r.color
    );
  });
  console.log(`✅ Seeded ${routineSessions.length} routine sessions for Section F1.`);
} catch (err) {
  console.warn('Routine seed note:', err.message);
}

// 5. Seed Tasks / Assignments
try {
  const tasks = [
    { id: 't_1', title: 'Implement Singly Linked List in C', course: 'CSE 101', priority: 'High', status: 'In Progress', due: '2026-10-05' },
    { id: 't_2', title: 'Calculus Practice Problem Set #3', course: 'MAT 101', priority: 'Medium', status: 'Pending', due: '2026-10-08' },
    { id: 't_3', title: 'Physics Lab Report on Pendulum Oscillation', course: 'PHY 101', priority: 'High', status: 'Pending', due: '2026-10-10' },
    { id: 't_4', title: 'English Essay: Technical Communication', course: 'ENG 101', priority: 'Low', status: 'Completed', due: '2026-09-25' }
  ];

  const taskCols = db.prepare("PRAGMA table_info(tasks)").all().map(c => c.name);
  const courseColInTask = taskCols.includes('courseName') ? 'courseName' : (taskCols.includes('courseCode') ? 'courseCode' : 'course');

  const insertTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (id, userId, title, ${courseColInTask}, priority, status, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  tasks.forEach((t) => {
    insertTask.run(t.id, defaultUserId, t.title, t.course, t.priority, t.status, t.due);
  });
  console.log(`✅ Seeded ${tasks.length} active coursework deliverables.`);
} catch (err) {
  console.warn('Task seed note:', err.message);
}

// 6. Seed Upcoming Midterm Exams
try {
  const exams = [
    { id: 'e_1', title: 'Midterm Examination', courseCode: 'CSE 101', date: '2026-10-18', time: '10:00 AM', room: 'Room 302' },
    { id: 'e_2', title: 'Midterm Examination', courseCode: 'MAT 101', date: '2026-10-21', time: '10:00 AM', room: 'Room 305' },
    { id: 'e_3', title: 'Midterm Examination', courseCode: 'PHY 101', date: '2026-10-24', time: '10:00 AM', room: 'Room 401' }
  ];

  const examCols = db.prepare("PRAGMA table_info(exams)").all().map(c => c.name);
  const courseColInExam = examCols.includes('courseCode') ? 'courseCode' : (examCols.includes('course') ? 'course' : 'subject');

  const insertExam = db.prepare(`
    INSERT OR REPLACE INTO exams (id, userId, title, ${courseColInExam}, date, time, room)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  exams.forEach((e) => {
    insertExam.run(e.id, defaultUserId, e.title, e.courseCode, e.date, e.time, e.room);
  });
  console.log(`✅ Seeded ${exams.length} scheduled examinations.`);
} catch (err) {
  console.warn('Exam seed note:', err.message);
}

console.log('🚀 Seeding complete! Database is populated and ready.');
process.exit(0);