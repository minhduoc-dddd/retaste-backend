const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// 1. Lấy cấu hình hiện tại (Chỉ có duy nhất 1 bản ghi cấu hình cho cả hệ thống)
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      // Nếu chưa có, tự động tạo cấu hình mặc định
      setting = new Setting();
      await setting.save();
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi lấy cấu hình hệ thống' });
  }
});

// 2. Admin cập nhật cấu hình
router.put('/', async (req, res) => {
  try {
    const { enable_cod, enable_momo, enable_bank, bank_info } = req.body;
    let setting = await Setting.findOne();
    
    if (!setting) {
      setting = new Setting();
    }
    
    setting.enable_cod = enable_cod;
    setting.enable_momo = enable_momo;
    setting.enable_bank = enable_bank;
    setting.bank_info = bank_info;

    await setting.save();
    res.json({ message: 'Cập nhật cấu hình thành công!', setting });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi cập nhật cấu hình' });
  }
});

module.exports = router;