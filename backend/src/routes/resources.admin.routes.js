// backend/src/routes/resources.admin.routes.js  (ADMIN ONLY)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const resourcesController = require('../controllers/resources.controller');
const { adminAuth } = require('../middleware/admin.middleware');

// ── Multer setup ──
const uploadDir = path.join(__dirname, '../../uploads/resources');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|ppt|pptx|zip)$/i;
    allowed.test(path.extname(file.originalname))
      ? cb(null, true)
      : cb(new Error('Only PDF, DOC, DOCX, PPT, PPTX, ZIP files are allowed'));
  }
});

// GET /api/admin/resources/all  ← MUST be before /:id
router.get('/all', adminAuth, resourcesController.getAllResourcesAdmin);

// POST /api/admin/resources
router.post('/', adminAuth, upload.single('file'), resourcesController.createResource);

// PUT /api/admin/resources/:id
router.put('/:id', adminAuth, upload.single('file'), resourcesController.updateResource);

// DELETE /api/admin/resources/:id
router.delete('/:id', adminAuth, resourcesController.deleteResource);

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  if (err)
    return res.status(400).json({ success: false, message: err.message });
  next();
});

module.exports = router;