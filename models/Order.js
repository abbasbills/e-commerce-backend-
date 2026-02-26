const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  // snapshot fields so order is stable even if product is deleted/edited
  productName: { type: String, required: true },
  productSku:  { type: String },
  quantity:    { type: Number, required: true, min: 1 },
  price:       { type: Number, required: true },   // unit price at order time
  subtotal:    { type: Number, required: true },   // price * quantity
}, { _id: true });

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items:        [orderItemSchema],
    totalAmount:  { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    shippingAddress: {
      fullName: { type: String, default: 'N/A' },
      street:   { type: String, default: 'N/A' },
      city:     { type: String, default: 'N/A' },
      state:    { type: String, default: 'N/A' },
      zip:      { type: String, default: 'N/A' },
      country:  { type: String, default: 'N/A' },
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-generate order number before first save
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const rand      = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
