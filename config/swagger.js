const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce API',
      version: '1.0.0',
      description:
        'Full-featured E-Commerce REST API with admin dashboard, product management, cart, orders, and simulated payments.',
      contact: {
        name: 'API Support',
        email: 'support@ecommerce.dev',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login or /api/auth/anonymous',
        },
      },
      schemas: {
        // ─── Auth ────────────────────────────────────────────────────────────
        RegisterInput: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            name:     { type: 'string', example: 'John Doe' },
            email:    { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 6, example: 'password123' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', example: 'password123' },
          },
        },
        AdminLoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'admin@ecommerce.dev' },
            password: { type: 'string', example: 'Admin@123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            token:   { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id:        { type: 'string' },
                name:      { type: 'string' },
                email:     { type: 'string' },
                role:      { type: 'string', enum: ['user', 'admin', 'anonymous'] },
                isAnonymous: { type: 'boolean' },
              },
            },
          },
        },
        // ─── Collection ──────────────────────────────────────────────────────
        CollectionInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name:        { type: 'string', example: 'Summer Collection' },
            description: { type: 'string', example: 'Light clothing for summer' },
            isActive:    { type: 'boolean', example: true },
          },
        },
        Collection: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            name:        { type: 'string' },
            description: { type: 'string' },
            slug:        { type: 'string' },
            isActive:    { type: 'boolean' },
            createdAt:   { type: 'string', format: 'date-time' },
            updatedAt:   { type: 'string', format: 'date-time' },
          },
        },
        // ─── Product ─────────────────────────────────────────────────────────
        Product: {
          type: 'object',
          properties: {
            _id:           { type: 'string' },
            name:          { type: 'string' },
            description:   { type: 'string' },
            price:         { type: 'number' },
            discountPrice: { type: 'number' },
            stock:         { type: 'integer' },
            collection:    { $ref: '#/components/schemas/Collection' },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url:         { type: 'string', description: 'Base64 data URL' },
                  contentType: { type: 'string' },
                },
              },
            },
            isActive:  { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Cart ────────────────────────────────────────────────────────────
        CartItem: {
          type: 'object',
          properties: {
            product:  { $ref: '#/components/schemas/Product' },
            quantity: { type: 'integer' },
            price:    { type: 'number' },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            _id:      { type: 'string' },
            user:     { type: 'string' },
            items:    { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            total:    { type: 'number' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Order ───────────────────────────────────────────────────────────
        OrderItem: {
          type: 'object',
          properties: {
            product:     { type: 'string' },
            productName: { type: 'string' },
            quantity:    { type: 'integer' },
            price:       { type: 'number' },
            subtotal:    { type: 'number' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id:           { type: 'string' },
            orderNumber:   { type: 'string' },
            user:          { type: 'string' },
            items:         { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            totalAmount:   { type: 'number' },
            status:        { type: 'string', enum: ['pending','processing','shipped','delivered','cancelled'] },
            paymentStatus: { type: 'string', enum: ['pending','paid','failed','refunded'] },
            shippingAddress: {
              type: 'object',
              properties: {
                fullName: { type: 'string' },
                street:   { type: 'string' },
                city:     { type: 'string' },
                state:    { type: 'string' },
                zip:      { type: 'string' },
                country:  { type: 'string' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Payment ─────────────────────────────────────────────────────────
        PaymentSimulateInput: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
            method:  { type: 'string', enum: ['card','bank_transfer','wallet'], example: 'card' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id:              { type: 'string' },
            order:            { type: 'string' },
            user:             { type: 'string' },
            amount:           { type: 'number' },
            method:           { type: 'string' },
            status:           { type: 'string', enum: ['pending','success','failed'] },
            transactionRef:   { type: 'string' },
            simulatedAt:      { type: 'string', format: 'date-time' },
          },
        },
        // ─── Common ──────────────────────────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data:    { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors:  { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    tags: [
      { name: 'Auth',     description: 'Authentication — register, login, anonymous sessions' },
      { name: 'Admin',    description: 'Admin-only — collections, products, order management' },
      { name: 'Products', description: 'Public product browsing' },
      { name: 'Cart',     description: 'Authenticated cart management' },
      { name: 'Orders',   description: 'Place and track orders' },
      { name: 'Payment',  description: 'Simulated payment processing' },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
