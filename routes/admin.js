const express = require('express');
const router  = express.Router();
const {
  createCollection, getAllCollections, getCollection, updateCollection, deleteCollection,
  createProduct, getAllProducts, getProduct, updateProduct, deleteProduct, deleteProductImage,
  getAllOrders, getOrderById, updateOrderStatus,
  getDashboard,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats (users, products, collections, orders, revenue)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', getDashboard);

// ══════════════════════════════════════════════════════════════════
//  COLLECTIONS
// ══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/collections:
 *   get:
 *     tags: [Admin]
 *     summary: List all collections (including inactive)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of collections
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
 *                     $ref: '#/components/schemas/Collection'
 */
router.get('/collections', getAllCollections);

/**
 * @swagger
 * /api/admin/collections:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new collection
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CollectionInput'
 *     responses:
 *       201:
 *         description: Collection created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Collection name already exists
 */
router.post('/collections', createCollection);

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a single collection by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Collection data
 *       404:
 *         description: Not found
 */
router.get('/collections/:id', getCollection);

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a collection
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CollectionInput'
 *     responses:
 *       200:
 *         description: Collection updated
 *       404:
 *         description: Not found
 */
router.put('/collections/:id', updateCollection);

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a collection (fails if products are attached)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Collection deleted
 *       400:
 *         description: Collection has products — cannot delete
 *       404:
 *         description: Not found
 */
router.delete('/collections/:id', deleteCollection);

// ══════════════════════════════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/products:
 *   get:
 *     tags: [Admin]
 *     summary: List all products (admin view, paginated)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: collection
 *         schema: { type: string }
 *         description: Filter by collection ID
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated product list
 */
router.get('/products', getAllProducts);

/**
 * @swagger
 * /api/admin/products:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new product with images (stored as Buffer in DB)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price, collection, stock]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Blue Denim Jacket
 *               description:
 *                 type: string
 *                 example: Classic cut denim jacket
 *               price:
 *                 type: number
 *                 example: 79.99
 *               discountPrice:
 *                 type: number
 *                 example: 59.99
 *               stock:
 *                 type: integer
 *                 example: 100
 *               collection:
 *                 type: string
 *                 description: MongoDB ObjectId of the collection
 *               sku:
 *                 type: string
 *                 example: DJ-BLU-001
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Validation error
 */
router.post('/products', upload.array('images', 10), createProduct);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a single product by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product data
 *       404:
 *         description: Not found
 */
router.get('/products/:id', getProduct);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a product (append new images if provided)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:          { type: string }
 *               description:   { type: string }
 *               price:         { type: number }
 *               discountPrice: { type: number }
 *               stock:         { type: integer }
 *               isActive:      { type: boolean }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated
 *       404:
 *         description: Not found
 */
router.put('/products/:id', upload.array('images', 10), updateProduct);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a product permanently
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 *       404:
 *         description: Not found
 */
router.delete('/products/:id', deleteProduct);

/**
 * @swagger
 * /api/admin/products/{id}/images/{imageId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Remove a specific image from a product
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Image removed
 *       404:
 *         description: Not found
 */
router.delete('/products/:id/images/:imageId', deleteProductImage);

// ══════════════════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List all orders (paginated, filterable)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, processing, shipped, delivered, cancelled] }
 *       - in: query
 *         name: paymentStatus
 *         schema: { type: string, enum: [pending, paid, failed, refunded] }
 *     responses:
 *       200:
 *         description: Paginated order list
 */
router.get('/orders', getAllOrders);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a single order by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order data
 *       404:
 *         description: Not found
 */
router.get('/orders/:id', getOrderById);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Update order fulfilment status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Not found
 */
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;
