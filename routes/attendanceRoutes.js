const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// 1. Nhân viên Check-in đầu ca
router.post('/checkin', async (req, res) => {
  try {
    const { employee_id, employee_name, date, check_in_time } = req.body;
    
    // Kiểm tra xem nhân viên này hôm nay đã check-in chưa
    const existing = await Attendance.findOne({ employee_id, date });
    if (existing) {
      return res.status(400).json({ message: 'Hôm nay bạn đã check-in rồi!' });
    }

    const newRecord = new Attendance({ employee_id, employee_name, date, check_in_time });
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi check-in', details: error.message });
  }
});

// 2. Nhân viên Check-out cuối ca
router.put('/checkout/:id', async (req, res) => {
  try {
    const { check_out_time } = req.body;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id, 
      { check_out_time }, 
      { new: true }
    );
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi check-out' });
  }
});

// 3. Lấy danh sách chấm công (Nhân viên chỉ lấy của mình, Admin lấy tất cả)
router.get('/', async (req, res) => {
  try {
    const { employee_id } = req.query;
    // Nếu có gửi employee_id lên thì lọc theo người đó, không thì lấy hết (dành cho Admin)
    const query = employee_id ? { employee_id } : {};
    
    // Sắp xếp theo ngày mới nhất lên đầu
    const records = await Attendance.find(query).sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi lấy dữ liệu chấm công' });
  }
});

// 4. Admin chỉnh sửa thủ công giờ công / trạng thái
router.put('/admin-edit/:id', async (req, res) => {
  try {
    const { check_in_time, check_out_time, status, note } = req.body;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id, 
      { check_in_time, check_out_time, status, note }, 
      { new: true }
    );
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi cập nhật chấm công' });
  }
});

module.exports = router;