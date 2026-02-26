const Cart    = require('../models/Cart');
const Product = require('../models/Product');

// ─── GET /api/cart ────────────────────────────────────────────────────────────
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice images stock isActive',
        populate: { path: 'collection', select: 'name' },
      });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Inject image URLs and compute totals
    const cartObj   = cart.toObject();
    cartObj.total     = 0;
    cartObj.itemCount = 0;

    cartObj.items = cartObj.items.map((item) => {
      if (item.product) {
        item.product.images = (item.product.images || []).map((img) => ({
          _id:         img._id,
          contentType: img.contentType,
          url:         `/api/products/image/${item.product._id}/${img._id}`,
        }));
      }
      cartObj.total     += item.price * item.quantity;
      cartObj.itemCount += item.quantity;
      return item;
    });

    res.json({ success: true, data: cartObj });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/cart/add ───────────────────────────────────────────────────────
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });

    const qty     = parseInt(quantity, 10);
    const product = await Product.findOne({ _id: productId, isActive: true });

    if (!product) return res.status(404).json({ success: false, message: 'Product not found or unavailable' });
    if (product.stock < qty) {
      return res.status(400).json({ success: false, message: `Only ${product.stock} unit(s) in stock` });
    }

    // Use effective price (discount if available)
    const effectivePrice = product.discountPrice != null ? product.discountPrice : product.price;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

    const existingItem = cart.items.find((i) => i.product.toString() === productId);

    if (existingItem) {
      const newQty = existingItem.quantity + qty;
      if (newQty > product.stock) {
        return res.status(400).json({ success: false, message: `Only ${product.stock} unit(s) available` });
      }
      existingItem.quantity = newQty;
      existingItem.price    = effectivePrice;
    } else {
      cart.items.push({ product: productId, quantity: qty, price: effectivePrice });
    }

    await cart.save();
    res.json({ success: true, message: 'Item added to cart', data: { itemCount: cart.items.length } });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/cart/update ─────────────────────────────────────────────────────
exports.updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'productId and quantity are required' });
    }

    const qty = parseInt(quantity, 10);
    if (qty < 0) return res.status(400).json({ success: false, message: 'Quantity cannot be negative' });

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const idx = cart.items.findIndex((i) => i.product.toString() === productId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

    if (qty === 0) {
      cart.items.splice(idx, 1);
    } else {
      const product = await Product.findById(productId);
      if (product && qty > product.stock) {
        return res.status(400).json({ success: false, message: `Only ${product.stock} unit(s) available` });
      }
      cart.items[idx].quantity = qty;
    }

    await cart.save();
    res.json({ success: true, message: 'Cart updated' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/cart/remove/:productId ──────────────────────────────────────
exports.removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const before = cart.items.length;
    cart.items   = cart.items.filter((i) => i.product.toString() !== req.params.productId);

    if (cart.items.length === before) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    await cart.save();
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/cart/clear ───────────────────────────────────────────────────
exports.clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
};
