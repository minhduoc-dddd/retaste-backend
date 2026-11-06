const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Liên kết với bảng User (ai là người đặt) - Đã bỏ required: true để khách vãng lai (chưa đăng nhập) cũng đặt được hàng
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Thông tin khách hàng đặt (tên, SĐT, địa chỉ)
  customer_info: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }
  },
  
  // Danh sách các món trong đơn hàng
  items: [{
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    product_name: { type: String },
    price: { type: Number },
    quantity: { type: Number }
  }],
  
  // Tổng tiền
  total_amount: {
    type: Number,
    required: true
  },
  
  // Trạng thái đơn hàng (Chờ duyệt -> Đang giao -> Hoàn tất)
  status: {
    type: String,
    enum: ['cho_duyet', 'dang_giao', 'hoan_tat', 'da_huy'],
    default: 'cho_duyet'
  }, // <--- DẤU PHẨY QUAN TRỌNG ĐÃ ĐƯỢC THÊM VÀO ĐÂY
  
  // Phương thức thanh toán (COD, MoMo, Chuyển khoản VietQR)
  payment_method: { 
    type: String, 
    enum: ['cod', 'momo', 'bank'],
    default: 'cod' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);