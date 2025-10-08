const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware
const validateSignup = [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /api/v1/user/signup
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: errors.array()[0].msg
      });
    }

    const { username, email, password } = req.body;
    const usersCollection = req.db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: 'User already exists with this email or username'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      username,
      email,
      password: hashedPassword,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(201).json({
      message: 'User created successfully.',
      user_id: result.insertedId.toString()
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/user/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: errors.array()[0].msg
      });
    }

    const { email, password } = req.body;
    const usersCollection = req.db.collection('users');

    // Find user by email or username
    const user = await usersCollection.findOne({
      $or: [{ email }, { username: email }]
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: 'Invalid Username and password'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        status: false,
        message: 'Invalid Username and password'
      });
    }

    res.status(200).json({
      message: 'Login successful.',
      jwt_token: 'Optional implementation'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
