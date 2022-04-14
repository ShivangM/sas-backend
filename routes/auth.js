const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
var fetchUser = require('../middleware/fetchUser')
require('dotenv').config();
const db = require("../db")
require('dotenv').config();

//Route 1: Create a User using: POST "/api/auth/createuser". No login required
router.post('/createuser', [
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'Password must be atleast 5 characters').isLength({ min: 5 }),
  body('type', 'Type Not Found').exists()
], async (req, res) => {
  // If there are errors, return Bad request and the errors

  let success = false;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Check whether the user with this email exists already
  try {
    const type = req.body.type;
    let user = type==="student"?
    await db.query(`SELECT * FROM student_authentications WHERE email= '${req.body.email}'`):
    await db.query(`SELECT * FROM teacher_authentications WHERE email= '${req.body.email}'`)

    let clg_authenticated = type==="student"?
    await db.query(`SELECT * FROM students WHERE email= '${req.body.email}'`):
    await db.query(`SELECT * FROM teacher WHERE email= '${req.body.email}'`)

    if (user.rows.length > 0) {
      return res.status(400).json({ success, error: "Sorry a user with this email already exists" })
    }

    if (clg_authenticated.rows.length === 0) {
      return res.status(400).json({ success, error: "Not registered to collage!" })
    }

    const salt = await bcrypt.genSalt(10);
    secPassword = await bcrypt.hash(req.body.password, salt);
    type==="student"?await 
    db.query(`insert into student_authentications values('${req.body.email}','${secPassword}')`):
    db.query(`insert into teacher_authentications values('${req.body.email}','${secPassword}')`)

    const data = {
      user: {
        email: req.body.email
      }
    }
    const authToken = jwt.sign(data, process.env.JWT_SECRET)
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
  body('type', 'Type Not Found').exists(),
], async (req, res) => {
  // If there are errors, return Bad request and the errors
  let success = false;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, type } = req.body;
  try {
    let user = type==="student"?
    await db.query(`SELECT * FROM student_authentications WHERE email='${email}'`):
    await db.query(`SELECT * FROM teacher_authentications WHERE email='${email}'`)

    if (user.rows.length === 0) {
      success = false;
      return res.status(400).json({ success, error: "Please try to login with valid email." })
    }

    const passwordComp = await bcrypt.compare(password, user.rows[0].password)
    if (!passwordComp) {
      success = false;
      return res.status(400).json({ success, error: "Incorrect Password" })
    }

    const data = {
      user: {
        email: email
      }
    }

    success = true
    const authToken = jwt.sign(data, process.env.JWT_SECRET)
    res.json({ success, authToken })

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some Error occured");
  }
})

//Route 3: Get User Details using: POST "/api/auth/getuser". Login required
router.post('/getuser', fetchUser, async (req, res) => {
  try {
    userEmail = req.email
    const user = req.body.type==="student"? 
    await db.query(`SELECT * FROM students WHERE email='${userEmail}'`):
    await db.query(`SELECT * FROM teacher WHERE email='${userEmail}'`)
    res.send(user.rows)
  } catch (error) {
    console.error(error.message);
    res.status(500).send("User Not Found!");
  }
})

module.exports = router