const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const os = require('os');
require('dotenv').config();

const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();

// ================= MIDDLEWARE =================
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json()); // Cho phép đọc dữ liệu dạng JSON

// ================= KHỞI TẠO DỮ LIỆU MẪU NẾU DB TRỐNG =================
const seedInitialProductsIfEmpty = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const sampleProducts = [
        {
          product_name: 'Phở Bò Tái Lăn Đặc Biệt',
          category: 'Đồ ăn',
          base_price: 65000,
          description: 'Nước dùng ninh xương bò 12 tiếng đậm đà, thịt bò tươi mềm thơm lừng hành gừng.',
          image_url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80',
          is_available: true,
          best_seller: true
        },
        {
          product_name: 'Bún Đậu Mắm Tôm Thập Cẩm',
          category: 'Đồ ăn',
          base_price: 55000,
          description: 'Mẹt bún đậu đầy đặn gồm đậu mơ rán giòn, chả cốm Hà Nội, thịt chân giò, nem chua rán.',
          image_url: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80',
          is_available: true,
          best_seller: true
        },
        {
          product_name: 'Bánh Xèo Tôm Nhảy Miền Trung',
          category: 'Đồ ăn',
          base_price: 45000,
          description: 'Vỏ bánh vàng giòn rụm, nhân tôm đất tươi ngọt, giá đỗ, ăn kèm rau sống và nước mắm chua ngọt.',
          image_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
          is_available: true,
          best_seller: true
        },
        {
          product_name: 'Cơm Tấm Sườn Bì Chả Trứng',
          category: 'Đồ ăn',
          base_price: 50000,
          description: 'Sườn cốt lết nướng mật ong thơm mềm, bì thính, chả hấp trứng muối và mỡ hành béo ngậy.',
          image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
          is_available: true,
          best_seller: false
        },
        {
          product_name: 'Trà Đào Cam Sả Nhiệt Đới',
          category: 'Thức uống',
          base_price: 35000,
          description: 'Trà đen ủ lạnh kết hợp đào miếng giòn ngọt, cam vàng tươi và hương sả thanh mát.',
          image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
          is_available: true,
          best_seller: true
        },
        {
          product_name: 'Cà Phê Sữa Đá Sài Gòn',
          category: 'Thức uống',
          base_price: 29000,
          description: 'Hạt Robusta rang mộc pha phin truyền thống hòa quyện cùng sữa đặc sánh mịn.',
          image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
          is_available: true,
          best_seller: false
        },
        {
          product_name: 'Combo Bữa Trưa Năng Lượng (Cơm Sườn + Trà Đào)',
          category: 'Combo',
          base_price: 75000,
          description: 'Tiết kiệm hơn với 01 phần Cơm Tấm Sườn Bì Chả đặc biệt kèm 01 ly Trà Đào Cam Sả mát lạnh.',
          image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
          is_available: true,
          best_seller: true
        },
        {
          product_name: 'Combo Đôi Bạn Thân (Bún Đậu 2 Người + 2 Trà Tắc)',
          category: 'Combo',
          base_price: 115000,
          description: 'Mẹt bún đậu thập cẩm cỡ lớn cho 2 người thưởng thức kèm 2 ly trà tắc giải nhiệt.',
          image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
          is_available: true,
          best_seller: false
        }
      ];
      await Product.insertMany(sampleProducts);
      console.log('🌱 Đã tự động khởi tạo 8 món ăn mẫu cho thực đơn RETASTE!');
    }
  } catch (err) {
    console.error('Không thể khởi tạo dữ liệu mẫu:', err.message);
  }
};

// ================= KẾT NỐI MONGODB =================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/retaste_db')
  .then(() => {
    console.log('✅ Đã kết nối thành công tới MongoDB (retaste_db)');
    seedInitialProductsIfEmpty();
  })
  .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

// ================= IMPORT CÁC ROUTES =================
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const settingRoutes = require('./routes/settingRoutes');
const aiRoutes = require('./routes/aiRoutes');

// ================= SỬ DỤNG ROUTES =================
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/ai', aiRoutes);

// ================= TÍCH HỢP THANH TOÁN MOMO (SANDBOX) =================
app.post('/api/payment/momo', (req, res) => {
  const { amount, orderInfo, redirectBaseUrl } = req.body;

  // Bộ Key Test (Sandbox) chính thức của MoMo dành cho lập trình viên
  const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
  const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
  const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

  const requestId = partnerCode + new Date().getTime();
  const orderId = requestId;

  // Tự động lấy Origin của Frontend để hoạt động tốt cả trên localhost lẫn mạng LAN
  const frontendOrigin = redirectBaseUrl || req.headers.origin || 'http://localhost:5173';
  const backendHost = req.headers.host || `localhost:${process.env.PORT || 5000}`;
  const redirectUrl = `${frontendOrigin.replace(/\/$/, '')}/cart`;
  const ipnUrl = `http://${backendHost}/api/payment/momo-ipn`;

  const requestType = 'captureWallet';
  const extraData = '';
  const orderInfoText = orderInfo || 'Thanh toan don hang RETASTE';
  const amountStr = String(Math.max(1000, Math.round(Number(amount || 10000))));

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

// Endpoint nhận IPN từ MoMo
app.post('/api/payment/momo-ipn', (req, res) => {
  res.status(204).end();
});

// ================= ROUTE CƠ BẢN =================
app.get('/', (req, res) => {
  res.send('API của RETASTE Backend đang hoạt động!');
});

// ================= KHỞI ĐỘNG SERVER =================
const PORT = process.env.PORT || 5000;

const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

app.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLocalIp();
  console.log(`🚀 Server Backend đang chạy tại:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://${lanIp}:${PORT}`);
});