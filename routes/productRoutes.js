const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductStats,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public endpoints
router.get('/', getProducts);

// Dashboard analytics endpoint (Must be defined BEFORE /:id)
router.get('/stats', protect, getProductStats);

router.get('/:id', getProductById);

// Admin-only protected endpoints
router.post('/', protect, upload.single('image'), createProduct);
router.put('/:id', protect, upload.single('image'), updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;
