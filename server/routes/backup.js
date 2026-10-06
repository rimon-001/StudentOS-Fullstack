import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET /api/backup/download - Download database snapshot
router.get('/download', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.role.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin privileges required' });
    }

    const dbPath = path.join(__dirname, '../studentos.sqlite');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: 'Database file not found' });
    }

    res.download(dbPath, `studentos_backup_${Date.now()}.sqlite`);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;