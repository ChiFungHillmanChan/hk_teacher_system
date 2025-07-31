const User = require('../models/User');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const validInviteCodes = new Set(['1234567890']);
const usedInviteCodes = new Set();

// Email configuration
const createEmailTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.warn('⚠️  Email not configured, using mock transporter');
    return {
      sendMail: async options => {
        console.log('📧 Mock email sent:', {
          to: options.to,
          subject: options.subject,
          hasHtml: !!options.html,
        });
        return { messageId: 'mock-' + Date.now() };
      },
    };
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};


// Helper function to send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  try {
    // Create token - make sure these methods exist on your User model
    const accessToken = user.generateAccessToken
      ? user.generateAccessToken()
      : user.getSignedJwtToken();

    // Generate refresh token if method exists
    let refreshToken = null;
    if (user.generateRefreshToken) {
      refreshToken = user.generateRefreshToken();
    }

    // Save refresh token to user if the method exists
    if (refreshToken && user.addRefreshToken) {
      user
        .addRefreshToken(refreshToken)
        .catch(err => console.error('Error saving refresh token:', err));
    }

    const cookieExpireDays = parseInt(process.env.JWT_COOKIE_EXPIRE) || 7;
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + cookieExpireDays);

    const options = {
      expires: expireDate,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    const responseData = {
      success: true,
      message,
      data: {
        token: accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          schools: user.schools,
          emailVerified: user.emailVerified,
        },
      },
    };

    // Only include refresh token if it was generated
    if (refreshToken) {
      responseData.data.refreshToken = refreshToken;
    }

    res.status(statusCode).cookie('token', accessToken, options).json(responseData);
  } catch (error) {
    console.error('sendTokenResponse error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating authentication tokens',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      name,
      email,
      phone,
      password,
      teacherId,
      inviteCode,
      preferredDistrict,
      experience,
      subjects,
    } = req.body;

    // Verify invite code if provided
    if (inviteCode) {
      if (!validInviteCodes.has(inviteCode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invite code',
        });
      }

      if (usedInviteCodes.has(inviteCode)) {
        return res.status(400).json({
          success: false,
          message: 'This invite code has already been used',
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Check if phone already exists
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this phone number',
        });
      }
    }

    // Check if teacherId already exists (if provided)
    if (teacherId) {
      const existingTeacherId = await User.findOne({ teacherId });
      if (existingTeacherId) {
        return res.status(400).json({
          success: false,
          message: 'Teacher ID already exists',
        });
      }
    }

    // Create user data object
    const userData = {
      name,
      email,
      phone: phone || '',
      password,
      inviteCode: inviteCode || '',
      role: 'teacher',
    };

    // Add optional fields if provided
    if (teacherId) userData.teacherId = teacherId;
    if (preferredDistrict) userData.preferredDistrict = preferredDistrict;
    if (experience !== undefined) userData.experience = experience;
    if (subjects && Array.isArray(subjects)) userData.subjects = subjects;

    // Create user
    const user = await User.create(userData);

    // Mark invite code as used (if provided)
    if (inviteCode) {
      usedInviteCodes.add(inviteCode);
    }

    // Generate email verification token if method exists
    if (user.generateEmailVerificationToken) {
      try {
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Send verification email
        try {
          await sendVerificationEmail(user.email, verificationToken);
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail registration if email fails
        }
      } catch (tokenError) {
        console.error('Email verification token generation failed:', tokenError);
      }
    }

    sendTokenResponse(
      user,
      201,
      res,
      'User registered successfully. Please check your email for verification.'
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

// @desc    Verify invite code
// @route   POST /api/auth/verify-invite
// @access  Public
const verifyInviteCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { inviteCode } = req.body;

    // Check if invite code is valid
    if (!validInviteCodes.has(inviteCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invite code',
      });
    }

    // Check if invite code has already been used
    if (usedInviteCodes.has(inviteCode)) {
      return res.status(400).json({
        success: false,
        message: 'This invite code has already been used',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invite code is valid',
    });
  } catch (error) {
    console.error('Invite code verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during invite code verification',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials', // Don't reveal if email exists or not
      });
    }

    // Check if account is locked (if method exists)
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message:
          'Account is temporarily locked due to multiple failed login attempts. Please try again later or use the forgot password feature.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    // Check password - use matchPassword or comparePassword
    const isMatch = user.matchPassword
      ? await user.matchPassword(password)
      : await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts if method exists
      if (user.incLoginAttempts) {
        try {
          await user.incLoginAttempts();
        } catch (error) {
          console.error('Error incrementing login attempts:', error);
        }
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials', // Generic message for security
      });
    }

    // Check if email is verified (optional - only if you require email verification)
    if (user.emailVerified === false) {
      return res.status(401).json({
        success: false,
        message:
          'Please verify your email address before logging in. Check your email for verification link.',
      });
    }

    // Reset login attempts on successful login if method exists
    if (user.resetLoginAttempts) {
      try {
        await user.resetLoginAttempts();
      } catch (error) {
        console.error('Error resetting login attempts:', error);
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Get refresh token from request body
    const { refreshToken } = req.body;

    if (refreshToken && req.user.revokeRefreshToken) {
      // Remove refresh token from user's tokens if method exists
      try {
        await req.user.revokeRefreshToken(refreshToken);
      } catch (error) {
        console.error('Error revoking refresh token:', error);
      }
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
const logoutAll = async (req, res) => {
  try {
    // Revoke all refresh tokens if method exists
    if (req.user.revokeAllRefreshTokens) {
      try {
        await req.user.revokeAllRefreshTokens();
      } catch (error) {
        console.error('Error revoking all refresh tokens:', error);
      }
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('schools', 'name nameEn schoolType');

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          teacherId: user.teacherId,
          schools: user.schools || [],
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const fieldsToUpdate = {};
    const allowedFields = ['name', 'email', 'teacherId'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    // Check if email is being changed and if it already exists
    if (fieldsToUpdate.email && fieldsToUpdate.email !== req.user.email) {
      const existingUser = await User.findOne({ email: fieldsToUpdate.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }
    }

    // Check if teacherId is being changed and if it already exists
    if (fieldsToUpdate.teacherId && fieldsToUpdate.teacherId !== req.user.teacherId) {
      const existingTeacherId = await User.findOne({ teacherId: fieldsToUpdate.teacherId });
      if (existingTeacherId) {
        return res.status(400).json({
          success: false,
          message: 'Teacher ID already exists',
        });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          teacherId: user.teacherId,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    console.error('Update details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens to force re-login on all devices if method exists
    if (user.revokeAllRefreshTokens) {
      try {
        await user.revokeAllRefreshTokens();
      } catch (error) {
        console.error('Error revoking refresh tokens:', error);
      }
    }

    sendTokenResponse(user, 200, res, 'Password updated successfully');
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, you will receive a password reset email shortly.',
      });
    }

    // Get reset token
    try {
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Create frontend reset URL instead of API URL
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

      // Send email
      try {
        await sendPasswordResetEmail(user.email, resetUrl, user.name);

        res.status(200).json({
          success: true,
          message: 'If an account with that email exists, you will receive a password reset email shortly.',
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);

        // Clean up the reset token if email fails
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return res.status(500).json({
          success: false,
          message: 'Failed to send password reset email. Please try again later.',
        });
      }
    } catch (tokenError) {
      console.error('Password reset token generation failed:', tokenError);
      return res.status(500).json({
        success: false,
        message: 'Unable to process password reset request. Please try again later.',
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};
// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetPasswordToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all refresh tokens if method exists
    if (user.revokeAllRefreshTokens) {
      try {
        await user.revokeAllRefreshTokens();
      } catch (error) {
        console.error('Error revoking refresh tokens:', error);
      }
    }

    sendTokenResponse(user, 200, res, 'Password reset successful');
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    // Get hashed token
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: emailVerificationToken,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token',
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    // Generate new verification token if method exists
    if (req.user.generateEmailVerificationToken) {
      try {
        const verificationToken = req.user.generateEmailVerificationToken();
        await req.user.save();

        // Send verification email
        try {
          await sendVerificationEmail(req.user.email, verificationToken);

          res.status(200).json({
            success: true,
            message: 'Verification email sent',
          });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          res.status(500).json({
            success: false,
            message: 'Email could not be sent',
          });
        }
      } catch (tokenError) {
        console.error('Email verification token generation failed:', tokenError);
        res.status(500).json({
          success: false,
          message: 'Verification token generation failed',
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Email verification not supported',
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const user = req.user;
    const oldRefreshToken = req.refreshToken;

    // Remove old refresh token if method exists
    if (user.revokeRefreshToken) {
      try {
        await user.revokeRefreshToken(oldRefreshToken);
      } catch (error) {
        console.error('Error revoking old refresh token:', error);
      }
    }

    // Generate new tokens
    const accessToken = user.generateAccessToken
      ? user.generateAccessToken()
      : user.getSignedJwtToken();
    let newRefreshToken = null;

    if (user.generateRefreshToken) {
      newRefreshToken = user.generateRefreshToken();
      try {
        await user.save();
      } catch (error) {
        console.error('Error saving new refresh token:', error);
      }
    }

    const options = {
      expires: new Date(
        Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    const responseData = {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: accessToken,
      },
    };

    if (newRefreshToken) {
      responseData.data.refreshToken = newRefreshToken;
    }

    res.status(200).cookie('token', accessToken, options).json(responseData);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Helper function to send verification email
const sendVerificationEmail = async (email, token) => {
  const transporter = createEmailTransporter();

  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;

  const message = {
    from: `"HK Teacher System" <${process.env.EMAIL_FROM || 'noreply@hkteacher.com'}>`,
    to: email,
    subject: 'Email Verification - HK Teacher System',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3498db; margin: 0;">HK Teacher System</h1>
          <p style="color: #666; margin: 5px 0;">Student Management Platform</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2d3748; margin-top: 0;">Verify Your Email Address</h2>
          <p style="color: #4a5568; line-height: 1.6;">
            Thank you for registering with HK Teacher System. To complete your registration and 
            start managing student records, please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background: #3498db; color: white; padding: 12px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            If the button above doesn't work, copy and paste the following link into your browser:
            <br>
            <a href="${verifyUrl}" style="color: #3498db; word-break: break-all;">${verifyUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 12px;">
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(message);
};

// Helper function to send password reset email
const sendPasswordResetEmail = async (email, resetUrl, userName) => {
  const transporter = createEmailTransporter();

  const message = {
    from: process.env.EMAIL_FROM || `"HK Teacher System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '密碼重設 - HK Teacher System',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e74c3c;">
            <h1 style="color: #e74c3c; margin: 0; font-size: 24px;">🎓 HK Teacher System</h1>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">香港教師學生管理系統</p>
          </div>
          
          <!-- Content -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #2d3748; margin-top: 0; font-size: 20px;">您好${userName ? ` ${userName}` : ''}，</h2>
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
              我們收到了您的密碼重設請求。請點擊下方按鈕來設定新密碼：
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-weight: bold; 
                        font-size: 16px;
                        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
                        transition: all 0.3s ease;">
                重設密碼
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              如果上方按鈕無法使用，請複製以下連結到瀏覽器中開啟：
            </p>
            <p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 13px; color: #495057;">
              ${resetUrl}
            </p>
          </div>
          
          <!-- Security Notice -->
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ 安全提醒：</strong>
            </p>
            <ul style="color: #856404; font-size: 13px; margin: 10px 0 0 0; padding-left: 20px;">
              <li>此連結將在 <strong>15分鐘</strong> 後失效</li>
              <li>如果您沒有要求重設密碼，請忽略此郵件</li>
              <li>請勿將此連結分享給他人</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              此郵件由 HK Teacher System 自動發送，請勿回覆
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              © ${new Date().getFullYear()} HK Teacher System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(message);
};

module.exports = {
  register,
  login,
  logout,
  logoutAll,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyInviteCode,
  resendVerification,
  refreshToken,
};
