const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Đăng ký tài khoản
const registerUser = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email đã được sử dụng!' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const role = email === 'dominhduoc283@gmail.com' ? 'admin' : 'khach_hang';

    const newUser = new User({
      full_name,
      email,
      password_hash,
      role
    });

    const savedUser = await newUser.save();
    res.status(201).json({ message: 'Đăng ký thành công!', user: savedUser });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi đăng ký', error });
  }
};

// 2. Đăng nhập
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email không tồn tại!' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu không đúng!' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'doan_cdio_se447_nhom9_secret_key', 
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      user: {
        id: user._id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        token: token
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi đăng nhập', error });
  }
};

// 3. Lấy danh sách toàn bộ người dùng / nhân viên (Admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password_hash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách người dùng', error });
  }
};

// 4. Cập nhật phân quyền / Trao quyền cho nhân viên (Admin)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
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
    res.status(500).json({ message: 'Lỗi khi cập nhật quyền', error });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  updateUserRole
};