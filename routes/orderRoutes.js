const express = require('express');
const router = express.Router();
// Nhớ import thêm updateOrderStatus
const { createOrder, getAllOrders, updateOrderStatus } = require('../controllers/orderController');

// Khách hàng gửi đơn hàng (POST /api/orders)
router.post('/', createOrder);

// Admin xem đơn hàng (GET /api/orders)
router.get('/', getAllOrders);

// Admin cập nhật trạng thái đơn hàng (PUT /api/orders/:id/status)
router.put('/:id/status', updateOrderStatus);

module.exports = router;