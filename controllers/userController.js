const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Đăng ký tài khoản
const registerUser = async (req, res) => {
  try {
    const { full_name, email, password, phone_number } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu!' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'Email đã được sử dụng!' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const role = normalizedEmail === 'dominhduoc283@gmail.com' ? 'admin' : 'khach_hang';

    const newUser = new User({
      full_name: full_name.trim(),
      email: normalizedEmail,
      password_hash,
      role,
      phone_number: phone_number || ''
    });

    const savedUser = await newUser.save();
    res.status(201).json({
      message: 'Đăng ký thành công!',
      user: {
        id: savedUser._id,
        name: savedUser.full_name,
        email: savedUser.email,
        role: savedUser.role,
        phone_number: savedUser.phone_number
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi đăng ký', error: error.message });
  }
};

// 2. Đăng nhập
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu!' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { email: email.trim() }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Email không tồn tại trong hệ thống!' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu không chính xác!' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'doan_cdio_se447_nhom9_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      user: {
        id: user._id,
        name: user.full_name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone_number: user.phone_number || '',
        token: token
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi đăng nhập', error: error.message });
  }
};

// 3. Lấy danh sách toàn bộ người dùng / nhân viên (Admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password_hash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách người dùng', error: error.message });
  }
};

// 4. Cập nhật phân quyền / Trao quyền cho nhân viên (Admin)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['khach_hang', 'nhan_vien', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Quyền không hợp lệ' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password_hash');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật quyền', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  updateUserRole
};