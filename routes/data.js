const express = require('express');
const router = express.Router();
// const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
var fetchUser = require('../middleware/fetchUser')
require('dotenv').config();
const db = require("../db")

//Route 1: Get User Details using: POST "/api/auth/getuser". Login required
router.post('/getattendance', fetchUser, async (req, res) => {
  try {
    userEmail = req.email
    const query = `
        SELECT a.date, a.subject_code, sub.subject_name, t.name, a.status
        FROM attendance a, teacher t, students s, subject sub, teaches te
        WHERE s.roll_number = a.roll_number 
        AND a.subject_code = te.subject_code 
        AND a.subject_code = sub.subject_code 
        AND te.email = t.email
        AND s.email = '${userEmail}';
    `
    const user = await db.query(query)
    res.send(user.rows)
  } catch (error) {
    console.error(error.message);
    res.status(500).send("User Not Found!");
  }
})

module.exports = router