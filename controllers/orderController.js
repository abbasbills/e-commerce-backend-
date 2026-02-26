const Order   = require('../models/Order');
const Cart    = require('../models/Cart');
const Product = require('../models/Product');

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// Converts the user's current cart into an order
exports.placeOrder = async (req, res, next) => {
  try {
    const { shippingAddress, notes } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Validate stock and build order items
    const orderItems = [];
    let totalAmount  = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.product.name}" is no longer available`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}`,
        });
      }

      const unitPrice = product.discountPrice != null ? product.discountPrice : product.price;
      const subtotal  = unitPrice * item.quantity;
      totalAmount    += subtotal;

      orderItems.push({
        product:     product._id,
        productName: product.name,
        productSku:  product.sku || '',
        quantity:    item.quantity,
        price:       unitPrice,
        subtotal,
      });

      // Deduct stock
      product.stock -= item.quantity;
      await product.save();
    }

    const order = await Order.create({
      user:            req.user._id,
      items:           orderItems,
      totalAmount,
      shippingAddress: shippingAddress || {},
      notes,
      status:          'pending',
      paymentStatus:   'pending',
    });

    // Clear the cart
    cart.items = [];
    await cart.save();

    res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/orders ──────────────────────────────────────────────────────────
exports.getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip   = (parseInt(page) - 1) * parseInt(limit);
    const total  = await Order.countDocuments({ user: req.user._id });
    const orders = await Order.find({ user: req.user._id })
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

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('paymentRef');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/orders/:id/cancel ───────────────────────────────────────────────
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order with status "${order.status}"`,
      });
    }

    // Restore stock
    for (const item of order.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, message: 'Order cancelled and stock restored', data: order });
  } catch (err) {
    next(err);
  }
};
