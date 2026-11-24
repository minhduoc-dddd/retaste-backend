const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');

// 1. Lấy tất cả sản phẩm
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ best_seller: -1, createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách sản phẩm', error: error.message });
  }
};

// 2. Thêm sản phẩm mới (Admin)
const createProduct = async (req, res) => {
  try {
    const { product_name, category, base_price, description, image_url, is_available, best_seller } = req.body;
    if (!product_name || !category || base_price === undefined) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên món, danh mục và giá bán!' });
    }
    const newProduct = new Product({
      product_name: product_name.trim(),
      category,
      base_price: Number(base_price),
      description: description || 'Món ngon chuẩn vị từ RETASTE.',
      image_url: image_url || '',
      is_available: is_available !== undefined ? Boolean(is_available) : true,
      best_seller: best_seller !== undefined ? Boolean(best_seller) : false
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo sản phẩm', error: error.message });
  }
};

// 3. Cập nhật sản phẩm (Admin)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
    }
    const updateData = { ...req.body };
    if (updateData.base_price !== undefined) {
      updateData.base_price = Number(updateData.base_price);
    }
    const updated = await Product.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm', error: error.message });
  }
};

// 4. Thuật toán gợi ý món ăn cá nhân hóa
const getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;

    const getFallbackRecommendations = async () => {
      const defaultProducts = await Product.find({ is_available: { $ne: false } })
        .sort({ best_seller: -1, createdAt: -1 })
        .limit(6);
      return res.json({
        title: 'GỢI Ý MÓN NGON PHỔ BIẾN CHO BẠN',
        data: defaultProducts
      });
    };

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return await getFallbackRecommendations();
    }

    const userOrders = await Order.find({ user_id: userId });

    if (userOrders.length === 0) {
      return await getFallbackRecommendations();
    }

    const productQuantities = {};
    const productIds = [];

    userOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        if (item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)) {
          const pid = String(item.product_id);
          productIds.push(pid);
          productQuantities[pid] = (productQuantities[pid] || 0) + (item.quantity || 1);
        }
      });
    });

    if (productIds.length === 0) {
      return await getFallbackRecommendations();
    }

    const purchasedProducts = await Product.find({ _id: { $in: productIds } });

    if (purchasedProducts.length === 0) {
      return await getFallbackRecommendations();
    }

    const categoryCount = {};
    purchasedProducts.forEach((prod) => {
      const cat = prod.category || 'Đồ ăn';
      const weight = productQuantities[String(prod._id)] || 1;
      categoryCount[cat] = (categoryCount[cat] || 0) + weight;
    });

    let favoriteCategory = '';
    let maxCount = 0;
    for (const cat in categoryCount) {
      if (categoryCount[cat] > maxCount) {
        maxCount = categoryCount[cat];
        favoriteCategory = cat;
      }
    }

    let recommendedProducts = await Product.find({
      category: favoriteCategory,
      is_available: { $ne: false }
    })
      .sort({ best_seller: -1, createdAt: -1 })
      .limit(6);

    if (recommendedProducts.length < 3) {
      const extraIds = recommendedProducts.map((p) => p._id);
      const extraProducts = await Product.find({
        _id: { $nin: extraIds },
        is_available: { $ne: false }
      })
        .sort({ best_seller: -1, createdAt: -1 })
        .limit(6 - recommendedProducts.length);
      recommendedProducts = [...recommendedProducts, ...extraProducts];
    }

    res.json({
      title: `GỢI Ý "${favoriteCategory.toUpperCase()}" DÀNH RIÊNG CHO BẠN`,
      favoriteCategory,
      data: recommendedProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi hệ thống gợi ý', error: error.message });
  }
};

// 5. Xóa sản phẩm (Admin)
const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    res.json({ message: 'Đã xóa sản phẩm thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa sản phẩm', error: error.message });
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  getRecommendations,
  deleteProduct
};