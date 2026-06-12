const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// @desc    Get all products (with search, filter, sort, pagination)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { search, category, sort, page = 1, limit = 8 } = req.query;

    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Sorting options
    let sortQuery = { createdAt: -1 }; // Default: Newest
    if (sort === 'price_asc') {
      sortQuery = { price: 1 };
    } else if (sort === 'price_desc') {
      sortQuery = { price: -1 };
    } else if (sort === 'oldest') {
      sortQuery = { createdAt: 1 };
    } else if (sort === 'newest') {
      sortQuery = { createdAt: -1 };
    }

    // Pagination setup
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum);

    // Get all unique categories in database for the search filter panel
    const categories = await Product.distinct('category');

    res.status(200).json({
      products,
      page: pageNum,
      pages: Math.ceil(totalProducts / limitNum),
      totalProducts,
      categories
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/products/stats
// @access  Private (Admin)
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    
    // Unique categories count
    const categories = await Product.distinct('category');
    const totalCategories = categories.length;

    // Recent 5 products
    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Aggregate category distribution for charting
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Check DB status
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';

    res.status(200).json({
      totalProducts,
      totalCategories,
      recentProducts,
      categoryStats,
      dbStatus
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.message);
    res.status(500).json({ message: 'Error compiling dashboard analytics data' });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product by ID:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Error fetching product details' });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  try {
    const { name, description, category, price, stock } = req.body;

    if (!name || !description || !category || !price || stock === undefined) {
      // If image uploaded, clean it up since creation failed
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Please provide all required product fields' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image for the product' });
    }

    // Store relative path in DB (e.g. /uploads/fieldname-timestamp.jpg)
    const imagePath = `/uploads/${req.file.filename}`;

    const product = new Product({
      name,
      description,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      image: imagePath
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error creating product:', error.message);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error creating product' });
  }
};

// @desc    Update existing product
// @route   PUT /api/products/:id
// @access  Private (Admin)
const updateProduct = async (req, res) => {
  try {
    const { name, description, category, price, stock } = req.body;
    
    let product = await Product.findById(req.params.id);
    if (!product) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update text fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);

    // If new image is uploaded
    if (req.file) {
      // Delete old image file if it exists
      if (product.image) {
        const oldImagePath = path.join(__dirname, '..', product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      // Set new image path
      product.image = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await product.save();
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error.message);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error updating product' });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete associated image file from disk
    if (product.image) {
      const imagePath = path.join(__dirname, '..', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Product.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error.message);
    res.status(500).json({ message: 'Server error deleting product' });
  }
};

module.exports = {
  getProducts,
  getProductStats,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
