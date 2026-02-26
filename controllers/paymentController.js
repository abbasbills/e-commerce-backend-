const Payment = require('../models/Payment');
const Order   = require('../models/Order');

// ─── Simulate a realistic gateway response ────────────────────────────────────
const simulateGateway = (method, amount) => {
  // 95 % success rate simulation
  const success = Math.random() < 0.95;

  return {
    gateway:        'SimPay v1.0',
    method,
    amount,
    currency:       'USD',
    status:         success ? 'approved' : 'declined',
    reason:         success ? 'Transaction approved' : 'Insufficient funds (simulated)',
    authCode:       success ? Math.random().toString(36).substring(2, 10).toUpperCase() : null,
    processingTime: `${(Math.random() * 300 + 100).toFixed(0)}ms`,
    simulatedAt:    new Date().toISOString(),
  };
};

// ─── POST /api/payment/simulate ───────────────────────────────────────────────
exports.simulatePayment = async (req, res, next) => {
  try {
    const { orderId, method = 'card' } = req.body;

    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' });

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order has already been paid' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled order' });
    }

    // Run simulated gateway
    const gatewayResponse = simulateGateway(method, order.totalAmount);
    const paymentStatus   = gatewayResponse.status === 'approved' ? 'success' : 'failed';

    // Create payment record
    const payment = await Payment.create({
      order:           order._id,
      user:            req.user._id,
      amount:          order.totalAmount,
      method,
      status:          paymentStatus,
      gatewayResponse,
      simulatedAt:     new Date(),
    });

    // Update order
    order.paymentStatus = paymentStatus === 'success' ? 'paid' : 'failed';
    if (paymentStatus === 'success') order.status = 'processing';
    order.paymentRef = payment._id;
    await order.save();

    res.status(201).json({
      success:        paymentStatus === 'success',
      message:        paymentStatus === 'success'
        ? '✅ Payment successful! Your order is now being processed.'
        : '❌ Payment declined (simulated). Please try again.',
      data: {
        transactionRef:  payment.transactionRef,
        amount:          payment.amount,
        method:          payment.method,
        status:          payment.status,
        orderNumber:     order.orderNumber,
        orderStatus:     order.status,
        paymentStatus:   order.paymentStatus,
        gatewayResponse,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payment/:orderId ────────────────────────────────────────────────
exports.getPaymentByOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const payment = await Payment.findOne({ order: req.params.orderId }).sort({ createdAt: -1 });
    if (!payment) return res.status(404).json({ success: false, message: 'No payment record found for this order' });

    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payment/history ─────────────────────────────────────────────────
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('order', 'orderNumber totalAmount status')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    next(err);
  }
};
