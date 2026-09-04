const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never return password in queries
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'DRIVER', 'DISPATCHER', 'ADMIN'],
      required: [true, 'Role is required'],
    },
  },
  { timestamps: true }
);

// Index on email is handled by unique: true above
module.exports = mongoose.model('User', userSchema);
