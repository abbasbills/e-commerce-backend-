const mongoose = require('mongoose');

// Each image is stored as raw binary (Buffer) with its MIME type
const imageSchema = new mongoose.Schema({
  data:        { type: Buffer, required: true },
  contentType: { type: String, required: true },   // e.g. "image/jpeg"
  filename:    { type: String },
}, { _id: true });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      default: null,
      validate: {
        validator: function (v) {
          // discount price must be less than regular price (if set)
          return v === null || v === undefined || v < this.price;
        },
        message: 'Discount price must be less than the regular price',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      required: [true, 'Collection/category is required'],
    },
    images: [imageSchema],   // ← stored as Buffer in MongoDB
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Virtual: effective selling price
productSchema.virtual('effectivePrice').get(function () {
  return this.discountPrice !== null && this.discountPrice !== undefined
    ? this.discountPrice
    : this.price;
});

// Virtual: discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.discountPrice && this.price > 0) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

productSchema.set('toObject', { virtuals: true });
productSchema.set('toJSON',   { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
