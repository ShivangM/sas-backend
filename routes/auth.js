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

const sendVerificationMail = (sendTo, verificationToken) => {
  const mailConfigurations = {
    from: process.env.EMAIL_USERNAME,
    to: sendTo,
    subject: 'Verify your SAS-IETDAVV Account',
    text: `Thank you for signup to SAS-IETDAVV please click the link to verifiy your account:
    https://sasietdavv-backend.herokuapp.com/api/auth/verify/${verificationToken}`
  };

  transporter.sendMail(mailConfigurations, function (error, info) {
    if (error) throw Error(error);
  });
}

router.get('/verify/:token', (req, res) => {
  const { token } = req.params;

  // Verifing the JWT token 
  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      console.log(err);
      res.send("Email verification failed, possibly the link is invalid or expired");
    }
    else {
      const userData = decoded.data

      const mailConfigurations = {
        from: process.env.EMAIL_USERNAME,
        to: userData.email,
        subject: 'Sucessfully Registered to SAS-IETDAVV',
        html: `<p> Your account has been created please <a href="https://sasietdavv.netlify.app/login">login</a> to continue.</p>`
      };

      const flag = true;

      try {
        userData.type === "student" ? 
        db.query(`insert into student_authentications values('${userData.email}','${userData.secPassword}')`):
        db.query(`insert into teacher_authentications values('${userData.email}','${userData.secPassword}')`)
      } catch (error) {
        flag = false
      }

      res.redirect("https://sasietdavv.netlify.app/login")

      if (flag) {
        transporter.sendMail(mailConfigurations, function (error, info) {
          if (error) throw Error(error);
        });
      }
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

  let success = false;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check whether the user with this email exists already
  try {
    const type = req.body.type;
    const email = req.body.email;

    let user = type === "student" ?
      await db.query(`SELECT * FROM student_authentications WHERE email= '${email}'`) :
      await db.query(`SELECT * FROM teacher_authentications WHERE email= '${email}'`)

    let clg_authenticated = type === "student" ?
      await db.query(`SELECT * FROM students WHERE email= '${email}'`) :
      await db.query(`SELECT * FROM teacher WHERE email= '${email}'`)

    if (user.rows.length > 0) {
      return res.status(400).json({ success, error: "Sorry a user with this email already exists" })
    }

    if (clg_authenticated.rows.length === 0) {
      return res.status(400).json({ success, error: "Not registered to collage!" })
    }

    const salt = await bcrypt.genSalt(10);
    const secPassword = await bcrypt.hash(req.body.password, salt);

    const token = jwt.sign({
      data: { email: email, type: type, secPassword: secPassword }
    }, process.env.JWT_SECRET, { expiresIn: '10m' }
    );

  sendVerificationMail(email, token)
  res.status(200).send("Verification Email Sent! Please verify your account to continue.")

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
    let user = type === "student" ?
      await db.query(`SELECT * FROM student_authentications WHERE email='${email}'`) :
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
    const user = req.body.type === "student" ?
      await db.query(`SELECT * FROM students WHERE email='${userEmail}'`) :
      await db.query(`SELECT * FROM teacher WHERE email='${userEmail}'`)
    res.send(user.rows)
  } catch (error) {
    console.error(error.message);
    res.status(500).send("User Not Found!");
  }
})

module.exports = router