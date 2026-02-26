const express = require('express');
const router  = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// All cart routes require authentication (user OR anonymous JWT)
router.use(protect);

/**
 * @swagger
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the current user's cart
 *     description: Works for both registered users and anonymous guests (pass their Bearer token).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cart with items, per-item images and computed totals
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Unauthorized
 */
router.get('/', getCart);

/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     tags: [Cart]
 *     summary: Add a product to the cart
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 65f1a2b3c4d5e6f7a8b9c0d1
 *               quantity:
 *                 type: integer
 *                 default: 1
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       200:
 *         description: Item added (or quantity incremented)
 *       400:
 *         description: Insufficient stock or invalid request
 *       404:
 *         description: Product not found
 */
router.post('/add', addToCart);

/**
 * @swagger
 * /api/cart/update:
 *   put:
 *     tags: [Cart]
 *     summary: Update item quantity (set to 0 to remove)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string }
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: Set to 0 to remove the item
 *     responses:
 *       200:
 *         description: Cart updated
 *       404:
 *         description: Item not in cart
 */
router.put('/update', updateCartItem);

/**
 * @swagger
 * /api/cart/remove/{productId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove a specific item from the cart
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed
 *       404:
 *         description: Item not in cart
 */
router.delete('/remove/:productId', removeFromCart);

/**
 * @swagger
 * /api/cart/clear:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear all items from the cart
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete('/clear', clearCart);

module.exports = router;
