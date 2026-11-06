const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee_id: { 
    type: String, 
    required: true 
  },
  employee_name: { 
    type: String, 
    required: true 
  },
  date: { 
    type: String, 
    required: true // Định dạng chuẩn: YYYY-MM-DD
  },
  check_in_time: { 
    type: String // Định dạng: HH:mm
  },
  check_out_time: { 
    type: String // Định dạng: HH:mm
  },
  status: { 
    type: String, 
    default: 'Đúng giờ' // Admin có thể đổi thành 'Đi muộn', 'Về sớm'
  },
  note: { 
    type: String, 
    default: '' // Ghi chú của Admin nếu có sửa đổi
  }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);