const express = require('express');
const router = express.Router();
const {
  chatWithAI,
  getSmartTimeRecommend,
  generateDishDescription,
  analyzeBusinessData,
} = require('../controllers/aiController');

// 1. Chatbot tư vấn món ăn & gợi ý theo ngân sách/khẩu vị
router.post('/chat', chatWithAI);

// 2. Gợi ý thông minh theo khung giờ & lịch sử đơn hàng
router.get('/smart-recommend', getSmartTimeRecommend);

// 3. Tự động viết mô tả món ăn chuẩn Marketing cho Admin
router.post('/generate-description', generateDishDescription);

// 4. Phân tích dữ liệu doanh thu & cố vấn chiến lược cho Admin
router.post('/analyze-business', analyzeBusinessData);

module.exports = router;
