const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  base_price: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  image_url: {
    type: String
  },
  is_available: {
    type: Boolean,
    default: true
  },
  best_seller: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);