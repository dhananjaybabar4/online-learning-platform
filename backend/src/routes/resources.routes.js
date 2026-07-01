// backend/src/routes/resources.routes.js  (PUBLIC ONLY)
const express = require('express');
const router = express.Router();
const resourcesController = require('../controllers/resources.controller');

// GET /api/resources
router.get('/', resourcesController.getAllResources);

// GET /api/resources/type/:type
router.get('/type/:type', resourcesController.getResourcesByType);

// GET /api/resources/:id  ← must be last
router.get('/:id', resourcesController.getResourceById);

module.exports = router;