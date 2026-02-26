const express = require('express');
const router  = express.Router();
const {
  getProducts,
  getProductById,
  getProductsByCollection,
  serveImage,
  getCollections,
} = require('../controllers/productController');

/**
 * @swagger
 * /api/collections:
 *   get:
 *     tags: [Products]
 *     summary: Get all active collections
 *     responses:
 *       200:
 *         description: List of active collections
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
router.get('/collections', getCollections);

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Browse all active products
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
 *         description: Filter by collection ObjectId
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by product name
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: '-createdAt' }
 *         description: Sort field (prefix with - for desc)
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 total:   { type: integer }
 *                 page:    { type: integer }
 *                 pages:   { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/products', getProducts);

/**
 * @swagger
 * /api/products/image/{productId}/{imageId}:
 *   get:
 *     tags: [Products]
 *     summary: Serve a product image stored as Buffer in MongoDB
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Binary image (JPEG / PNG / GIF / WebP)
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 */
router.get('/products/image/:productId/:imageId', serveImage);

/**
 * @swagger
 * /api/products/collection/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Get products by collection slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: summer-collection
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Products in the collection
 *       404:
 *         description: Collection not found
 */
router.get('/products/collection/:slug', getProductsByCollection);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/products/:id', getProductById);

module.exports = router;
