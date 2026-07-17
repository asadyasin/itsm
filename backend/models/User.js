const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'manager', 'user'], default: 'user', index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }, // soft delete
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    refreshTokenHash: { type: String, select: false } // hashed current refresh token (rotation)
  },
  { timestamps: true }
);

userSchema.index({ name: 'text', email: 'text' });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
