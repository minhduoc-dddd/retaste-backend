const mongoose = require('mongoose');
const Order = require('../models/Order');

// 1. Khách hàng tạo đơn đặt món
const createOrder = async (req, res) => {
  try {
    const { user_id, customer_info, items, total_amount, payment_method, status } = req.body;

    if (!customer_info?.name || !customer_info?.phone || !customer_info?.address) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin giao hàng!' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng không được để trống!' });
    }

    const validUserId =
      user_id && mongoose.Types.ObjectId.isValid(user_id) ? user_id : undefined;

    const sanitizedItems = items.map((item) => ({
      product_id:
        item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)
          ? item.product_id
          : undefined,
      product_name: item.product_name || item.name || 'Món ăn RETASTE',
      price: Number(item.price || item.base_price || 0),
      quantity: Math.max(1, Number(item.quantity || 1))
    }));

    const newOrder = new Order({
      user_id: validUserId,
      customer_info: {
        name: customer_info.name.trim(),
        phone: customer_info.phone.trim(),
        address: customer_info.address.trim()
      },
      items: sanitizedItems,
      total_amount: Number(total_amount || 0),
      payment_method: ['cod', 'momo', 'bank'].includes(payment_method) ? payment_method : 'cod',
      status: ['cho_duyet', 'dang_giao', 'hoan_tat', 'da_huy'].includes(status) ? status : 'cho_duyet'
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Lỗi khi tạo đơn hàng:', error);
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng', error: error.message });
  }
};

// 2. Admin lấy danh sách tất cả đơn hàng (sắp xếp mới nhất lên đầu)
const getAllOrders = async (req, res) => {
  try {
    const { user_id } = req.query;
    const filter =
      user_id && mongoose.Types.ObjectId.isValid(user_id) ? { user_id } : {};

    const orders = await Order.find(filter)
      .populate('user_id', 'email full_name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách đơn hàng', error: error.message });
  }
};

// 3. Admin/Nhân viên cập nhật trạng thái đơn hàng
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['cho_duyet', 'dang_giao', 'hoan_tat', 'da_huy'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user_id', 'email full_name');

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái', error: error.message });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  updateOrderStatus
};