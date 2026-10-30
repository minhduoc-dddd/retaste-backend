const express = require('express');
const router = express.Router();
const { 
  getAllProducts, 
  createProduct, 
  getRecommendations, 
  deleteProduct 
} = require('../controllers/productController');

router.get('/', getAllProducts);
router.post('/', createProduct);
router.get('/recommend/:userId', getRecommendations);
router.delete('/:id', deleteProduct);

module.exports = router;