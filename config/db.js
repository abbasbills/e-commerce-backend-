const mongoose = require('mongoose');

const MAX_RETRIES    = 5;
const RETRY_DELAY_MS = 5000;   // 5 s between attempts

const connectDB = async (attempt = 1) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const isIPError = error.message.includes('IP') ||
                      error.message.includes('whitelist') ||
                      error.message.includes('ENOTFOUND') ||
                      error.message.includes('Could not connect');

    console.error(`❌  MongoDB Connection Error (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);

    if (isIPError) {
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('  FIX: Your IP is not whitelisted on MongoDB Atlas.');
      console.error('  1. Run:  node scripts/get-my-ip.js  to find your IP');
      console.error('  2. Go to: https://cloud.mongodb.com');
      console.error('     → Security → Network Access → Add IP Address');
      console.error('     → Click "Allow Access from Anywhere" (for dev)');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    if (attempt < MAX_RETRIES) {
      console.log(`⏳  Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(attempt + 1);
    }

    console.error('🛑  Max retries reached. Server running WITHOUT database.');
    console.error('   Fix the Atlas IP whitelist and restart the server.\n');
    // Do NOT exit — let the HTTP server keep running so you can see Swagger docs
  }
};

module.exports = connectDB;
