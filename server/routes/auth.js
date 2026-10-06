import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'studentos_jwt_dev_secret_key_123';

// Safeguard: Make sure columns exist without crashing
try {
  const existingCols = db.pragma('table_info(users)').map(c => c.name);
  const extraCols = [
    { name: 'studentId', type: 'TEXT' },
    { name: 'university', type: 'TEXT' },
    { name: 'department', type: 'TEXT' },
    { name: 'program', type: 'TEXT' },
    { name: 'semester', type: 'TEXT' },
    { name: 'section', type: 'TEXT' },
    { name: 'academicSession', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'bloodGroup', type: 'TEXT' },
    { name: 'bio', type: 'TEXT' },
    { name: 'skills', type: 'TEXT' },
    { name: 'avatar', type: 'TEXT' }
  ];

  for (const col of extraCols) {
    if (!existingCols.includes(col.name)) {
      try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
      } catch (err) {
        // Safe skip
      }
    }
  }
} catch (e) {
  console.warn('[Auth Initialization Check]:', e.message);
}

// In-memory OTP storage
const passwordResetStore = new Map();

// Helper to normalize the user payload sent to frontend
const formatUserObject = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;

  let parsedSkills = [];
  if (safeUser.skills) {
    try {
      parsedSkills = JSON.parse(safeUser.skills);
    } catch {
      parsedSkills = typeof safeUser.skills === 'string' 
        ? safeUser.skills.split(',').map(s => s.trim()) 
        : [];
    }
  }

  return {
    ...safeUser,
    skills: parsedSkills
  };
};

// ==========================================
// 1. REGISTER NEW USER
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
      university = 'Daffodil International University',
      department = 'Software Engineering',
      program = 'Undergraduate (B.Sc.)',
      semester = '1st Semester',
      section = 'F1',
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const userId = 'u_' + Date.now();
    const assignedStudentId = studentId && studentId.trim() ? studentId.trim() : `262-35-${Math.floor(100 + Math.random() * 900)}`;

    // Insert user into SQLite database safely
    const insertStmt = db.prepare(`
      INSERT INTO users (
        id, name, email, password, role, status, 
        studentId, university, department, program, semester, section
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      userId,
      name.trim(),
      cleanEmail,
      hashedPassword,
      'STUDENT',
      'Active',
      assignedStudentId,
      university,
      department,
      program,
      semester,
      section
    );

    const rawUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const formattedUser = formatUserObject(rawUser);

    const token = jwt.sign(
      { id: formattedUser.id, email: formattedUser.email, role: formattedUser.role, name: formattedUser.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`[AUTH] Successfully registered new user: ${cleanEmail} (${userId})`);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: formattedUser,
      },
    });
  } catch (err) {
    console.error('Registration server error:', err);
    return res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
});

// ==========================================
// 2. LOGIN USER
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid institutional credentials' });
    }

    // Defensive check to avoid "Illegal arguments: string, object" error
    const rawStoredPassword = user.password;
    const storedHash = typeof rawStoredPassword === 'string'
      ? rawStoredPassword
      : (rawStoredPassword?.toString ? rawStoredPassword.toString() : '');

    if (!storedHash) {
      console.error(`[AUTH] Stored password missing or invalid for user: ${cleanEmail}`);
      return res.status(500).json({ success: false, message: 'Corrupted credentials. Please reset password.' });
    }

    const isMatch = await bcrypt.compare(String(password), storedHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid institutional credentials' });
    }

    // Check account standing
    if (user.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Your student account is suspended. Contact campus admin.' });
    }

    const formattedUser = formatUserObject(user);

    const token = jwt.sign(
      { id: formattedUser.id, email: formattedUser.email, role: formattedUser.role, name: formattedUser.name },
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    console.log(`[AUTH] User logged in: ${cleanEmail} (${formattedUser.role})`);

    return res.json({
      success: true,
      data: {
        token,
        user: formattedUser,
      },
    });
  } catch (err) {
    console.error('Login server error:', err);
    return res.status(500).json({ success: false, message: 'Login failed due to a server error' });
  }
});

// ==========================================
// 3. GET CURRENT USER (/api/auth/me)
// ==========================================
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({ success: true, data: formatUserObject(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user session' });
  }
});

// ==========================================
// 4. FORGOT PASSWORD (OTP GENERATION)
// ==========================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name FROM users WHERE LOWER(email) = ?').get(cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered student found with this email' });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    passwordResetStore.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    console.log(`🔑 [PASSWORD RESET OTP] For ${cleanEmail}: ${otp}`);

    return res.json({
      success: true,
      message: `Recovery code generated! Check server console (OTP: ${otp})`
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initiate recovery process' });
  }
});

// ==========================================
// 5. RESET PASSWORD WITH OTP
// ==========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const storedRecord = passwordResetStore.get(cleanEmail);

    if (!storedRecord || storedRecord.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    if (Date.now() > storedRecord.expiresAt) {
      passwordResetStore.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
    }

    const newHashedPassword = await bcrypt.hash(String(newPassword), 10);
    db.prepare('UPDATE users SET password = ? WHERE LOWER(email) = ?').run(newHashedPassword, cleanEmail);

    passwordResetStore.delete(cleanEmail);
    console.log(`✅ [PASSWORD RESET] Password updated successfully for: ${cleanEmail}`);

    return res.json({ success: true, message: 'Password updated successfully. You can now login.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

// ==========================================
// 6. UPDATE STUDENT PROFILE
// ==========================================
router.put('/profile', requireAuth, (req, res) => {
  try {
    const {
      name,
      phone,
      bloodGroup,
      bio,
      skills,
      avatar,
      department,
      program,
      semester,
      section,
    } = req.body;

    const updateStmt = db.prepare(`
      UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        bloodGroup = COALESCE(?, bloodGroup),
        bio = COALESCE(?, bio),
        skills = COALESCE(?, skills),
        avatar = COALESCE(?, avatar),
        department = COALESCE(?, department),
        program = COALESCE(?, program),
        semester = COALESCE(?, semester),
        section = COALESCE(?, section)
      WHERE id = ?
    `);

    updateStmt.run(
      name || null,
      phone || null,
      bloodGroup || null,
      bio || null,
      skills ? JSON.stringify(skills) : null,
      avatar || null,
      department || null,
      program || null,
      semester || null,
      section || null,
      req.user.id
    );

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: formatUserObject(updatedUser)
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

export default router;