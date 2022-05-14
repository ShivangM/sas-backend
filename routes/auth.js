const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
var fetchUser = require('../middleware/fetchUser')
require('dotenv').config();
const db = require("../db")
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USERNAME,
    pass: process.env.PASSWORD,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN
  }
});


//Function to send verification mail
const sendVerificationMail = (sendTo, verificationToken) => {
  const mailConfigurations = {
    from: process.env.EMAIL_USERNAME,
    to: sendTo,
    subject: 'Verify your SAS-IETDAVV Account',
    text: `Thank you for signup to SAS-IETDAVV please click the link to verifiy your account:
    https://sasietdavv-backend.herokuapp.com/api/auth/verify/${verificationToken}
    
    Please ignore this email if this was not attemted by you.`
  };

  transporter.sendMail(mailConfigurations, function (error, info) {
    if (error) return false;
  });

  return true
}


//Verify email of user
router.get('/verify/:token', (req, res) => {
  const { token } = req.params;

  // Verifing the JWT token 
  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      res.status(400).send("Email verification failed, possibly the link is invalid or expired");
    }
    else {
      const userData = decoded.data
      userData.type === "student" ? 
      db.query(`insert into student_authentications values('${userData.email}','${userData.secPassword}')`):
      db.query(`insert into teacher_authentications values('${userData.email}','${userData.secPassword}')`)
      res.redirect("https://sasietdavv.netlify.app/login")
    }
  });
});

//Route 1: Create a User using: POST "/api/auth/createuser". No login required
router.post('/createuser', [
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'Password must be atleast 5 characters').isLength({ min: 5 }),
  body('type', 'Type Not Found').exists()
], async (req, res) => {
  // If there are errors, return Bad request and the errors
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {type , email} = req.body;

  // Check whether the user with this email exists already
  try {
    let user = type === "student" ?
      await db.query(`SELECT * FROM student_authentications WHERE email= '${email}'`) :
      await db.query(`SELECT * FROM teacher_authentications WHERE email= '${email}'`)

    let clg_authenticated = type === "student" ?
      await db.query(`SELECT * FROM students WHERE email= '${email}'`):
      await db.query(`SELECT * FROM teacher WHERE email= '${email}'`)

    const varified = true

    if (user.rows.length > 0) {
      res.status(400).send("Sorry a user with this email already exists!")
      varified = false
    }

    if (clg_authenticated.rows.length === 0) {
      res.status(400).send("Sorry your email is not registered by collage!")
      varified = false
    }

    const salt = await bcrypt.genSalt(10);
    const secPassword = await bcrypt.hash(req.body.password, salt);

    const token = await jwt.sign({
      data: { email: email, type: type, secPassword: secPassword }
    }, process.env.JWT_SECRET, { expiresIn: '10m' }
    );

  if(varified){
    const emailSent = await sendVerificationMail(email, token)
    emailSent? res.status(200).send("Verification Email Sent! Please verify your account to continue.")
    :res.status(400).send("Failed to send verification email. Please Provide a valid email address!")
  }

  } catch (error) {
    res.status(500).send("Some Error occured");
  }
})

//Route 2: Login User using: POST "/api/auth/login". No login required
router.post('/login', [
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'Password cannot be blank').exists(),
  body('type', 'Type Not Found').exists(),
], async (req, res) => {

  // If there are errors, return Bad request and the errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, type } = req.body;

  try {
    let user = type === "student" ?
      await db.query(`SELECT * FROM student_authentications WHERE email='${email}'`) :
      await db.query(`SELECT * FROM teacher_authentications WHERE email='${email}'`)

    if (user.rows.length === 0) {
      return res.status(400).json({error: "Incorrect Email Or Password" })
    }

    const passwordComp = await bcrypt.compare(password, user.rows[0].password)
    if (!passwordComp) {
      return res.status(400).json({error: "Incorrect Email Or Password" })
    }

    const data = {
      user: {
        email: email
      }
    }

    const authToken = jwt.sign(data, process.env.JWT_SECRET)
    res.status(200).json({authToken })

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some Error occured");
  }
})

//Route 2: Login User using: POST "/api/auth/login". No login required
router.post('/login', [
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'Password cannot be blank').exists(),
  body('type', 'Type Not Found').exists(),
], async (req, res) => {

  // If there are errors, return Bad request and the errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, type } = req.body;

  try {
    let user = type === "student" ?
      await db.query(`SELECT * FROM student_authentications WHERE email='${email}'`) :
      await db.query(`SELECT * FROM teacher_authentications WHERE email='${email}'`)

    if (user.rows.length === 0) {
      return res.status(400).json({error: "Incorrect Email Or Password" })
    }

    const passwordComp = await bcrypt.compare(password, user.rows[0].password)
    if (!passwordComp) {
      return res.status(400).json({error: "Incorrect Email Or Password" })
    }

    const data = {
      user: {
        email: email
      }
    }

    const authToken = jwt.sign(data, process.env.JWT_SECRET)
    res.status(200).json({authToken })

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some Error occured");
  }
})

//Route 3: Get User Details using: POST "/api/auth/getuser". Login required
router.post('/getuser', fetchUser, async (req, res) => {
  try {
    userEmail = req.email
    const user = req.body.type === "student" ?
      await db.query(`SELECT * FROM students WHERE email='${userEmail}'`) :
      await db.query(`SELECT * FROM teacher WHERE email='${userEmail}'`)
    res.status(200).send(user.rows)
  } catch (error) {
    console.error(error.message);
    res.status(500).send("User Not Found!");
  }
})

//Route: Update Password: POST "/api/auth/changepassword". login required
router.post('/changepassword', [
  body('newPassword', 'Password must be atleast 5 characters').isLength({ min: 5 }),
  body('password', 'Password must be atleast 5 characters').exists(),
  body('type', 'Type Not Found').exists()
], async (req, res) => {
  // If there are errors, return Bad request and the errors
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {type , newPassword, password, email} = req.body;

  // Check whether the user with this email exists already
  try {
    let oldPassword = "";
    type==="student"?
    oldPassword = await db.query(`
      SELECT password FROM student_authentications 
      WHERE email='${email}';
    `)
    :
    oldPassword = await db.query(`
      SELECT password FROM teacher_authentications 
      WHERE email='${email}';
    `)

    const comp = await bcrypt.compare(password, oldPassword.rows[0].password)

    if (comp) {

      const salt = await bcrypt.genSalt(10);
      const secPassword = await bcrypt.hash(newPassword, salt);

      const result = await db.query(`
        UPDATE student_authentications SET 
        password='${secPassword}' 
        WHERE email='${email}';
      `)

      res.status(200).send("Updated Password")
    } else {
      res.status(401).send("Could Not Update Password")
    }

  } catch (error) {
    res.status(500).send("Some Error occured");
  }
})

module.exports = router