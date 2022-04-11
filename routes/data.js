const express = require('express');
const router = express.Router();
// const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
var fetchUser = require('../middleware/fetchUser')
require('dotenv').config();
const db = require("../db")

//Route 1: Get User Attendance Details using: POST "/api/data/getattendance". Login required
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
    const attendance = await db.query(query)
    res.send(attendance.rows)
  } catch (error) {
    console.error(error.message);
    res.status(500).send("User Not Found!");
  }
})

//Route 2: Feed Attendance Details using: POST "/api/auth/feedattendance". Login required
router.post('/feedattendance', fetchUser, async (req, res) => {
  try {
    userEmail = req.email
    const query = `INSERT INTO attendance VALUES('${req.body.subject_code}','${req.body.roll_number}','${req.body.status}');`
    db.query(query)
    res.status(200).send("Ok")
  } catch (error) {
    console.error(error.message);
    res.status(500).send("User Not Found!");
  }
})

//Route 1: Get User Subject Details using: POST "/api/data/getattendance". Login required
router.post('/getsubjects', fetchUser, async (req, res) => {
  try {
    userEmail = req.email
    const queryForSubjectDetails = `
    SELECT subject.subject_name, subject.subject_code, teacher.name
    FROM subject
    INNER JOIN teaches ON teaches.subject_code = subject.subject_code
    INNER JOIN teacher ON teacher.email = teaches.email
    WHERE subject.subject_code IN (
        SELECT subject_code
        FROM takes
        INNER JOIN class ON (class.semester_number = takes.semester_number) AND (class.branch = takes.branch)
        INNER JOIN students ON class.roll_number = students.roll_number
        WHERE students.email = '${userEmail}'
    );
    `

    const queryForTotalClassesInEachSubject = `
    SELECT subject_code, COUNT(DISTINCT(date)) AS classes 
    FROM attendance
    WHERE attendance.subject_code IN (
        SELECT subject_code
        FROM takes
        INNER JOIN class ON (class.semester_number = takes.semester_number) AND (class.branch = takes.branch)
        INNER JOIN students ON class.roll_number = students.roll_number
        WHERE students.email = '${userEmail}'
    )
    GROUP BY subject_code;
    `
    const queryForClassAttendedInEachSubject = `
    SELECT subject_code, COUNT(*) AS class_attended FROM attendance
    INNER JOIN students on students.roll_number = attendance.roll_number
    WHERE students.email = '${userEmail}' AND attendance.status = 'Present'
    GROUP BY subject_code;
    `

    const queryForDate = `
    SELECT date, status, subject_code FROM attendance
    INNER JOIN students ON students.roll_number = attendance.roll_number 
    WHERE students.email = '${userEmail}'
    ORDER BY date;
    `

    const subjectDetails = await db.query(queryForSubjectDetails)
    const totalClassInEachSubject = await db.query(queryForTotalClassesInEachSubject)
    const classAttendedInEachSubject = await db.query(queryForClassAttendedInEachSubject)
    const calenderData = await db.query(queryForDate)
    const percentageInEachSubject = [];

    for (let index = 0; index < totalClassInEachSubject.rows.length; index++) {
      const percentage = classAttendedInEachSubject.rows[index] ?
        (classAttendedInEachSubject.rows[index].class_attended / totalClassInEachSubject.rows[index].classes) * 100 : 0
      percentageInEachSubject.push(percentage)
    }

    res.send({ subjectDetails: subjectDetails.rows, percentage: percentageInEachSubject, calanderData: calenderData.rows })
  } catch (error) {
    console.error(error.message);
    res.status(500).send("User Not Found!");
  }
})

module.exports = router