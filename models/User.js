const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: 'Guest',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,        // allows multiple null values
      unique: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,       // never returned in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'anonymous'],
      default: 'user',
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    // optional profile fields
    phone:   { type: String, trim: true },
    address: {
      street:  String,
      city:    String,
      state:   String,
      zip:     String,
      country: String,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password helper
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
