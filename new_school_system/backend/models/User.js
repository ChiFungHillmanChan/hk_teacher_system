const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      match: [/^[+]?[0-9\s\-()]+$/, 'Please provide a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ['teacher', 'admin'],
      default: 'teacher',
    },
    teacherId: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values, creates index automatically
    },
    // New registration fields
    inviteCode: {
      type: String,
      required: false,
    },
    preferredDistrict: {
      type: String,
      enum: [
        'Central and Western',
        'Eastern',
        'Southern',
        'Wan Chai',
        'Kowloon City',
        'Kwun Tong',
        'Sham Shui Po',
        'Wong Tai Sin',
        'Yau Tsim Mong',
        'Islands',
        'Kwai Tsing',
        'North',
        'Sai Kung',
        'Sha Tin',
        'Tai Po',
        'Tsuen Wan',
        'Tuen Mun',
        'Yuen Long',
      ],
    },
    experience: {
      type: Number,
      min: [0, 'Experience cannot be negative'],
      max: [50, 'Experience cannot exceed 50 years'],
    },
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    schools: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'School',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 2592000, // 30 days
        },
      },
    ],
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Alternative method name for compatibility
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and return a JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '1d',
    }
  );
};

// Alternative method name for compatibility
userSchema.methods.generateAccessToken = function () {
  return this.getSignedJwtToken();
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const refreshToken = crypto.randomBytes(40).toString('hex');

  // Add to refresh tokens array
  this.refreshTokens.push({ token: refreshToken });

  // Keep only the last 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }

  return refreshToken;
};

// Remove refresh token
userSchema.methods.removeRefreshToken = function (refreshToken) {
  this.refreshTokens = this.refreshTokens.filter(tokenObj => tokenObj.token !== refreshToken);
};

// Alternative method names for compatibility
userSchema.methods.revokeRefreshToken = function (refreshToken) {
  return this.removeRefreshToken(refreshToken);
};

userSchema.methods.revokeAllRefreshTokens = function () {
  this.refreshTokens = [];
  return this.save();
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  return verificationToken;
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set expire
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};

// Alternative method name for compatibility
userSchema.methods.generatePasswordResetToken = function () {
  return this.getResetPasswordToken();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // If we're at max attempts and it's not locked already, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Static method to find user by credentials and handle login attempts
userSchema.statics.getAuthenticated = async function (email, password) {
  const user = await this.findOne({ email }).select('+password');

  if (!user) {
    return { user: null, reason: 'NOT_FOUND' };
  }

  // Check if account is currently locked
  if (user.isLocked) {
    // Just increment login attempts and return
    await user.incLoginAttempts();
    return { user: null, reason: 'MAX_ATTEMPTS' };
  }

  // Test for a matching password
  const isMatch = await user.matchPassword(password);

  if (isMatch) {
    // If there's no lock or failed attempts, just return the user
    if (!user.loginAttempts && !user.lockUntil) {
      user.lastLogin = new Date();
      await user.save();
      return { user };
    }

    // Reset attempts and return user
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();
    return { user };
  }

  // Password is incorrect, so increment login attempts before responding
  await user.incLoginAttempts();
  return { user: null, reason: 'PASSWORD_INCORRECT' };
};

module.exports = mongoose.model('User', userSchema);
