const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password_hash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['khach_hang', 'nhan_vien', 'admin'],
    default: 'khach_hang'
  },
  phone_number: {
    type: String
  }
}, { timestamps: true }); // Tự động tạo created_at và updated_at

module.exports = mongoose.model('User', userSchema);