const Collection = require('../models/Collection');
const Product    = require('../models/Product');
const Order      = require('../models/Order');
const User       = require('../models/User');

// ══════════════════════════════════════
//  COLLECTIONS
// ══════════════════════════════════════

// POST /api/admin/collections
exports.createCollection = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Collection name is required' });

    const collection = await Collection.create({
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Collection created', data: collection });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/collections
exports.getAllCollections = async (req, res, next) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 });
    res.json({ success: true, count: collections.length, data: collections });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/collections/:id
exports.getCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    res.json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/collections/:id
exports.updateCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    res.json({ success: true, message: 'Collection updated', data: collection });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/collections/:id
exports.deleteCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    // Check if products use this collection
    const productCount = await Product.countDocuments({ collection: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${productCount} product(s) belong to this collection`,
      });
    }

    await collection.deleteOne();
    res.json({ success: true, message: 'Collection deleted' });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════

// POST /api/admin/products  (multipart/form-data; images stored as Buffer)
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, discountPrice, stock, collection, category: categoryField, sku, tags } = req.body;
    const categoryId = categoryField || collection; // accept both 'category' and legacy 'collection'

    if (!name || !price || !categoryId) {
      return res.status(400).json({ success: false, message: 'name, price and collection/category are required' });
    }

    // Build images array from uploaded files
    const images = (req.files || []).map((file) => ({
      data:        file.buffer,
      contentType: file.mimetype,
      filename:    file.originalname,
    }));

    const product = await Product.create({
      name,
      description,
      price:         parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      stock:         parseInt(stock, 10) || 0,
      category:      categoryId,
      sku,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
      images,
      createdBy: req.user._id,
    });

    // Return without raw buffer data in response
    const productObj = product.toObject();
    productObj.images = productObj.images.map((img) => ({
      _id:         img._id,
      contentType: img.contentType,
      filename:    img.filename,
      url:         `/api/products/image/${product._id}/${img._id}`,
    }));

    res.status(201).json({ success: true, message: 'Product created', data: productObj });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/products
exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, collection, search, isActive } = req.query;
    const query = {};

    if (collection)          query.category = collection;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search)              query.name = { $regex: search, $options: 'i' };

    const skip     = (parseInt(page) - 1) * parseInt(limit);
    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select('-images.data')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Inject image URLs
    const data = products.map((p) => {
      const obj = p.toObject();
      obj.images = (obj.images || []).map((img) => ({
        _id:         img._id,
        contentType: img.contentType,
        filename:    img.filename,
        url:         `/api/products/image/${p._id}/${img._id}`,
      }));
      return obj;
    });

    res.json({
      success: true,
      count:   data.length,
      total,
      page:    parseInt(page),
      pages:   Math.ceil(total / parseInt(limit)),
      data,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('-images.data')
      .populate('category', 'name slug');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const obj = product.toObject();
    obj.images = (obj.images || []).map((img) => ({
      _id:         img._id,
      contentType: img.contentType,
      filename:    img.filename,
      url:         `/api/products/image/${product._id}/${img._id}`,
    }));

    res.json({ success: true, data: obj });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const fields = ['name', 'description', 'price', 'discountPrice', 'stock', 'category', 'sku', 'tags', 'isActive'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) product[f] = req.body[f];
    });

    // Append any new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        data:        file.buffer,
        contentType: file.mimetype,
        filename:    file.originalname,
      }));
      product.images.push(...newImages);
    }

    await product.save();

    const obj = product.toObject();
    obj.images = (obj.images || []).map((img) => ({
      _id:         img._id,
      contentType: img.contentType,
      filename:    img.filename,
      url:         `/api/products/image/${product._id}/${img._id}`,
    }));

    res.json({ success: true, message: 'Product updated', data: obj });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/products/:id/images/:imageId
exports.deleteProductImage = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.images = product.images.filter(
      (img) => img._id.toString() !== req.params.imageId
    );
    await product.save();

    res.json({ success: true, message: 'Image removed' });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════
//  ORDERS (admin view)
// ══════════════════════════════════════

// GET /api/admin/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const query = {};
    if (status)        query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip   = (parseInt(page) - 1) * parseInt(limit);
    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email role isAnonymous')
      .populate('paymentRef')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count:   orders.length,
      total,
      page:    parseInt(page),
      pages:   Math.ceil(total / parseInt(limit)),
      data:    orders,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email role isAnonymous')
      .populate('paymentRef');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed    = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order status updated', data: order });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════
//  DASHBOARD STATS
// ══════════════════════════════════════

// GET /api/admin/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalProducts, totalCollections, totalOrders, recentOrders, orderStats] =
      await Promise.all([
        User.countDocuments({ role: { $ne: 'admin' } }),
        Product.countDocuments(),
        Collection.countDocuments(),
        Order.countDocuments(),
        Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
        Order.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        ]),
      ]);

    const revenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProducts,
          totalCollections,
          totalOrders,
          totalRevenue: revenue[0]?.total || 0,
        },
        ordersByStatus: orderStats,
        recentOrders,
      },
    });
  } catch (err) {
    next(err);
  }
};
