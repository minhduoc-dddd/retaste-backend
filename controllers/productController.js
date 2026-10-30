const Product = require('../models/Product');
const Order = require('../models/Order');

// 1. Lấy tất cả sản phẩm
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách sản phẩm', error });
  }
};

// 2. Thêm sản phẩm mới (Admin)
const createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo sản phẩm', error });
  }
};

// 3. Thuật toán gợi ý món ăn
const getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const userOrders = await Order.find({ user_id: userId });
    
    if (userOrders.length === 0) {
      const defaultProducts = await Product.find().limit(3);
      return res.json({ 
        title: 'GỢI Ý MÓN NGON PHỔ BIẾN CHO BẠN', 
        data: defaultProducts 
      });
    }

    const productIds = [];
    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.product_id) productIds.push(item.product_id);
      });
    });

    if (productIds.length === 0) {
      const defaultProducts = await Product.find().limit(3);
      return res.json({ title: 'GỢI Ý MÓN NGON PHỔ BIẾN CHO BẠN', data: defaultProducts });
    }

    const purchasedProducts = await Product.find({ _id: { $in: productIds } });
    
    const categoryCount = {};
    purchasedProducts.forEach(prod => {
      const cat = prod.category || 'Khác';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    let favoriteCategory = '';
    let maxCount = 0;
    for (const cat in categoryCount) {
      if (categoryCount[cat] > maxCount) {
        maxCount = categoryCount[cat];
        favoriteCategory = cat;
      }
    }

    const recommendedProducts = await Product.find({ category: favoriteCategory }).limit(3);

    res.json({ 
      title: `GỢI Ý "${favoriteCategory.toUpperCase()}" DÀNH RIÊNG CHO BẠN`, 
      data: recommendedProducts 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi hệ thống gợi ý', error });
  }
};

// 4. Xóa sản phẩm (Admin)
const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    res.json({ message: 'Đã xóa sản phẩm thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa sản phẩm', error });
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  getRecommendations,
  deleteProduct
};