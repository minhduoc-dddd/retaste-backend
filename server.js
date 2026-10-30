const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json()); // Cho phép đọc dữ liệu dạng JSON

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Đã kết nối thành công tới MongoDB (retaste_db)'))
  .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

// ================= CÁC ROUTES API =================
// Import các routes
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes'); // Đưa import userRoutes ra ngoài này

// Sử dụng routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes); // Đặt ngang hàng với products và orders

// ==================================================

// Route cơ bản để test server
app.get('/', (req, res) => {
  res.send('API của RETASTE Backend đang hoạt động!');
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});