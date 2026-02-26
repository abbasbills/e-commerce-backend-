require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const swaggerUi      = require('swagger-ui-express');
const connectDB      = require('./config/db');
const swaggerSpec    = require('./config/swagger');
const errorHandler   = require('./middleware/errorHandler');

// ─── Route imports ───────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const productRoutes  = require('./routes/products');
const cartRoutes     = require('./routes/cart');
const orderRoutes    = require('./routes/orders');
const paymentRoutes  = require('./routes/payment');

const app = express();

// ─── Connect to MongoDB ──────────────────────────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:      'OK',
    service:     'E-Commerce API',
    version:     '1.0.0',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── Swagger UI ───────────────────────────────────────────────────────────────
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer:    true,
    customSiteTitle: 'E-Commerce API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion:         'list',
      filter:               true,
    },
  })
);

// Expose raw OpenAPI JSON for external tooling
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api',         productRoutes);    // /api/products & /api/collections
app.use('/api/cart',    cartRoutes);
app.use('/api/orders',  orderRoutes);
app.use('/api/payment', paymentRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`\n🚀  E-Commerce API running on http://localhost:${PORT}`);
  console.log(`📚  Swagger Docs:  http://localhost:${PORT}/api/docs`);
  console.log(`❤️   Health check:  http://localhost:${PORT}/health\n`);

  // Seed default admin if not exists
  await seedAdmin();
});

// ─── Seed default admin account ───────────────────────────────────────────────
async function seedAdmin() {
  // Wait for mongoose to be actually connected before seeding
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    // Not connected yet — listen for the open event
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) return resolve();
      mongoose.connection.once('open', resolve);
      mongoose.connection.once('error', resolve);  // resolve (not reject) so we don't crash
    });
  }

  // If still not connected after waiting, skip seed silently
  if (mongoose.connection.readyState !== 1) return;

  try {
    const User = require('./models/User');
    const existing = await User.findOne({ role: 'admin' });
    if (existing) return;

    await User.create({
      name:     'Super Admin',
      email:    'admin@ecommerce.dev',
      password: 'Admin@123',
      role:     'admin',
    });

    console.log('🌱  Default admin seeded:');
    console.log('    Email:    admin@ecommerce.dev');
    console.log('    Password: Admin@123');
    console.log('    ⚠️  Change this password after first login!\n');
  } catch (err) {
    if (err.code !== 11000) console.error('Seed error:', err.message);
  }
}

module.exports = app;
