const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

const app = express();

// ================= MIDDLEWARE =================
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json()); // Cho phép đọc dữ liệu dạng JSON

// ================= KẾT NỐI MONGODB =================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Đã kết nối thành công tới MongoDB (retaste_db)'))
  .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

// ================= IMPORT CÁC ROUTES =================
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes'); 
const attendanceRoutes = require('./routes/attendanceRoutes');
const settingRoutes = require('./routes/settingRoutes'); 

// ================= SỬ DỤNG ROUTES =================
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/attendance', attendanceRoutes);
app.use('/api/settings', settingRoutes);

// ================= TÍCH HỢP THANH TOÁN MOMO (SANDBOX) =================
app.post('/api/payment/momo', (req, res) => {
  const { amount, orderInfo } = req.body;

  // Bộ Key Test (Sandbox) chính thức của MoMo dành cho lập trình viên
  const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
  const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
  const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

  const requestId = partnerCode + new Date().getTime();
  const orderId = requestId;
  const redirectUrl = 'http://localhost:5173/cart';
  const ipnUrl = 'http://localhost:5000/api/payment/momo-ipn';
  const requestType = 'captureWallet';
  const extraData = '';
  const orderInfoText = orderInfo || 'Thanh toan don hang RETASTE';
  const amountStr = String(amount || 10000);

  // Tạo chữ ký điện tử (Signature) bảo mật theo chuẩn HMAC SHA256 của MoMo
  const rawSignature =
    `accessKey=${accessKey}&amount=${amountStr}&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfoText}` +
    `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
    `&requestId=${requestId}&requestType=${requestType}`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  const requestBody = JSON.stringify({
    partnerCode,
    accessKey,
    requestId,
    amount: amountStr,
    orderId,
    orderInfo: orderInfoText,
    redirectUrl,
    ipnUrl,
    extraData,
    requestType,
    signature,
    lang: 'vi',
  });

  const options = {
    hostname: 'test-payment.momo.vn',
    port: 443,
    path: '/v2/gateway/api/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
    },
  };

  const momoReq = https.request(options, (momoRes) => {
    let data = '';
    momoRes.on('data', (chunk) => {
      data += chunk;
    });
    momoRes.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.payUrl) {
          return res.status(200).json({ payUrl: result.payUrl, orderId });
        }
        return res.status(400).json({ message: result.message || 'Không tạo được link MoMo', result });
      } catch (err) {
        return res.status(500).json({ message: 'Lỗi đọc phản hồi từ MoMo' });
      }
    });
  });

  momoReq.on('error', (error) => {
    return res.status(500).json({ message: 'Lỗi kết nối cổng MoMo', error: error.message });
  });

  momoReq.write(requestBody);
  momoReq.end();
});

// ================= ROUTE CƠ BẢN =================
app.get('/', (req, res) => {
  res.send('API của RETASTE Backend đang hoạt động!');
});

// ================= KHỞI ĐỘNG SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});