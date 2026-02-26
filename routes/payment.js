const express = require('express');
const router  = express.Router();
const {
  simulatePayment,
  getPaymentByOrder,
  getPaymentHistory,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /api/payment/simulate:
 *   post:
 *     tags: [Payment]
 *     summary: Simulate a payment for an order
 *     description: |
 *       No real card data is collected. This endpoint simulates a payment
 *       gateway with a **95% success rate**. On success the order status
 *       moves to `processing` and `paymentStatus` becomes `paid`.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentSimulateInput'
 *     responses:
 *       201:
 *         description: Payment result (success or declined)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:         { type: boolean }
 *                 message:         { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionRef:  { type: string }
 *                     amount:          { type: number }
 *                     method:          { type: string }
 *                     status:          { type: string }
 *                     orderNumber:     { type: string }
 *                     orderStatus:     { type: string }
 *                     paymentStatus:   { type: string }
 *                     gatewayResponse: { type: object }
 *       400:
 *         description: Order already paid or cancelled
 *       404:
 *         description: Order not found
 */
router.post('/simulate', simulatePayment);

/**
 * @swagger
 * /api/payment/history:
 *   get:
 *     tags: [Payment]
 *     summary: Get the current user's payment history
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 */
router.get('/history', getPaymentHistory);

/**
 * @swagger
 * /api/payment/{orderId}:
 *   get:
 *     tags: [Payment]
 *     summary: Get the payment record for an order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       404:
 *         description: No payment found for this order
 */
router.get('/:orderId', getPaymentByOrder);

module.exports = router;
