import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the local storage directory exists
const uploadDir = path.join(__dirname, '../uploads/materials');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedBase}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max limit
});

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// GET /api/materials (Fetch only authenticated user's records)
router.get('/', requireAuth, (req, res) => {
  try {
    const materials = db
      .prepare('SELECT * FROM materials WHERE userId = ? ORDER BY uploadDate DESC, rowid DESC')
      .all(req.user.id);
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/materials (Handles both actual file uploads and external web/drive links)
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  try {
    const { courseCode, title, type, url, size, courseId } = req.body;

    if (!title || !courseCode) {
      return res.status(400).json({ success: false, message: 'Title and Course Code are required' });
    }

    let finalUrl = url || '#';
    let finalSize = size || 'Cloud URL';

    // If an actual file was attached, point to static express route
    if (req.file) {
      finalUrl = `http://localhost:5001/uploads/materials/${req.file.filename}`;
      finalSize = formatBytes(req.file.size);
    }

    const newMaterial = {
      id: 'm_' + Date.now(),
      userId: req.user.id,
      courseId: courseId || 'c1',
      courseCode: courseCode.trim().toUpperCase(),
      title: title.trim(),
      type: type || 'Lectures',
      size: finalSize,
      uploadDate: new Date().toISOString().split('T')[0],
      url: finalUrl,
    };

    const insert = db.prepare(`
      INSERT INTO materials (id, userId, courseId, courseCode, title, type, size, uploadDate, url)
      VALUES (@id, @userId, @courseId, @courseCode, @title, @type, @size, @uploadDate, @url)
    `);
    insert.run(newMaterial);

    res.status(201).json({ success: true, data: newMaterial });
  } catch (error) {
    console.error('Material upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/materials/:id (Removes database row & local binary file)
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    const material = db
      .prepare('SELECT * FROM materials WHERE id = ? AND userId = ?')
      .get(id, req.user.id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found or access denied' });
    }

    // Clean up file from disk if it was saved locally
    if (material.url && material.url.includes('/uploads/materials/')) {
      const fileName = material.url.split('/uploads/materials/')[1];
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn('Could not delete file from disk:', err.message);
        }
      }
    }

    db.prepare('DELETE FROM materials WHERE id = ? AND userId = ?').run(id, req.user.id);

    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;