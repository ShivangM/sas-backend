const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
var fetchUser = require('../middleware/fetchUser')
const JWT_SECRET = "secretadon"
const db = require("../db")

//Route 1: Create a User using: POST "/api/auth/createuser". No login required
router.post('/createuser', [
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'Password must be atleast 5 characters').isLength({ min: 5 }),
], async (req, res) => {
  // If there are errors, return Bad request and the errors

  let success = false;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Check whether the user with this email exists already
  try {
    let user = await db.query(`SELECT * FROM authentications WHERE email= '${req.body.email}'`)

    if (user.rows.length > 0) {
      return res.status(400).json({ success, error: "Sorry a user with this email already exists" })
    }

    const salt = await bcrypt.genSalt(10);
    secPassword = await bcrypt.hash(req.body.password, salt);
    await db.query(`insert into authentications values('${req.body.email}','${secPassword}')`)

    const data = {
      user: {
        id: user.id
      }
    }
    const authToken = jwt.sign(data, JWT_SECRET)
    success = true;
    res.json({ success, authToken })

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some Error occured");
  }
})

//Route 2: Authenticate a User using: POST "/api/auth/login". No login required
router.post('/login', [
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
  // If there are errors, return Bad request and the errors
  let success = false;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    let user = await db.query(`SELECT * FROM authentications WHERE email='${email}'`)
    if (user.rows.length === 0) {
      success = false;
      return res.status(400).json({ success, error: "Please try to login with valid credentials." })
    }

    const passwordComp = await bcrypt.compare(password, user.rows[0].password)
    if (!passwordComp) {
      success = false;
      return res.status(400).json({ success, error: "Please try to login with valid credentials." })
    }

    const data = {
      user: {
        id: user.id
      }
    }

    success = true
    const authToken = jwt.sign(data, JWT_SECRET)
    res.json({ success, authToken })

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some Error occured");
  }
})

//Route 3: Get User Details using: POST "/api/auth/getuser". Login required
router.post('/getuser', fetchUser, async (req, res) => {
  try {
    userID = req.user.id
    const user = await User.findById(userID)
    res.send(user)
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some Error occured");
  }
})

module.exports = router