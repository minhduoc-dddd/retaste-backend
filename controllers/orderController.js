const Order = require('../models/Order');

// 1. Khách hàng tạo đơn đặt món
const createOrder = async (req, res) => {
  try {
    const { user_id, customer_info, items, total_amount } = req.body;
    
    const newOrder = new Order({
      user_id,
      customer_info,
      items,
      total_amount
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng', error });
  }
};

// 2. Admin lấy danh sách tất cả đơn hàng
const getAllOrders = async (req, res) => {
  try {
    // populate('user_id') giúp lấy luôn thông tin user (email, tên) thay vì chỉ lấy cái ID
    const orders = await Order.find().populate('user_id', 'email full_name');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách đơn hàng', error });
  }
};

// 3. ĐÂY LÀ HÀM BỊ THIẾU: Admin cập nhật trạng thái đơn hàng
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      { status: status },
      { new: true } 
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái', error });
  }
};

// Xuất cả 3 hàm ra ngoài
module.exports = {
  createOrder,
  getAllOrders,
  updateOrderStatus
};