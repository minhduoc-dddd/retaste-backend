const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  enable_cod: { type: Boolean, default: true },
  enable_momo: { type: Boolean, default: true },
  enable_bank: { type: Boolean, default: true },
  bank_info: {
    bank_id: { type: String, default: 'MB' }, // Mã ngân hàng (VD: MB, VCB, ACB, CTG...)
    account_no: { type: String, default: '' }, // Số tài khoản
    account_name: { type: String, default: '' } // Tên chủ tài khoản
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);