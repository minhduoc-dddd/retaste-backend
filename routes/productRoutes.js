const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  createProduct,
  updateProduct,
  getRecommendations,
  deleteProduct
} = require('../controllers/productController');

router.get('/', getAllProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.get('/recommend/:userId', getRecommendations);
router.delete('/:id', deleteProduct);

module.exports = router;