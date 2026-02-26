const Product    = require('../models/Product');
const Collection = require('../models/Collection');

// Helper: strip buffer from images and inject URL
const injectImageUrls = (product) => {
  const obj = product.toObject ? product.toObject() : product;
  obj.images = (obj.images || []).map((img) => ({
    _id:         img._id,
    contentType: img.contentType,
    filename:    img.filename,
    url:         `/api/products/image/${obj._id}/${img._id}`,
  }));
  return obj;
};

// ─── GET /api/products ───────────────────────────────────────────────────────
exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, collection, search, minPrice, maxPrice, sort = '-createdAt' } = req.query;

    const query = { isActive: true };
    if (collection) query.category = collection;
    if (search)     query.name = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const skip     = (parseInt(page) - 1) * parseInt(limit);
    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select('-images.data')
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const data = products.map(injectImageUrls);

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

// ─── GET /api/products/:id ───────────────────────────────────────────────────
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true })
      .select('-images.data')
      .populate('category', 'name slug');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.json({ success: true, data: injectImageUrls(product) });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/products/collection/:slug ─────────────────────────────────────
exports.getProductsByCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findOne({ slug: req.params.slug, isActive: true });
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    const { page = 1, limit = 20 } = req.query;
    const skip     = (parseInt(page) - 1) * parseInt(limit);
    const query    = { category: collection._id, isActive: true };
    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select('-images.data')
      .populate('category', 'name slug')
      .skip(skip)
      .limit(parseInt(limit))
      .sort('-createdAt');

    const data = products.map(injectImageUrls);

    res.json({
      success: true,
      collection,
      count:  data.length,
      total,
      page:   parseInt(page),
      pages:  Math.ceil(total / parseInt(limit)),
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/products/image/:productId/:imageId ─────────────────────────────
// Serve a raw image directly from the database buffer
exports.serveImage = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId).select('images');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const image = product.images.id(req.params.imageId);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(image.data);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/collections ────────────────────────────────────────────────────
exports.getCollections = async (req, res, next) => {
  try {
    const collections = await Collection.find({ isActive: true }).sort('name');
    res.json({ success: true, count: collections.length, data: collections });
  } catch (err) {
    next(err);
  }
};
