const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ['card', 'bank_transfer', 'wallet'],
      default: 'card',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    transactionRef: {
      type: String,
      unique: true,
    },
    // Simulated gateway response stored here
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    simulatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Auto-generate transaction reference
paymentSchema.pre('save', function (next) {
  if (!this.transactionRef) {
    this.transactionRef = `TXN-${uuidv4().toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
