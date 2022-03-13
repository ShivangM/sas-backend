const connectToMongo = require("./db")
const express = require('express')
var cors = require('cors')
require('dotenv').config()

connectToMongo();
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

//Available Routes
app.use('/api/auth', require("./routes/auth"))

app.listen(port, () => {
  console.log(`SAS backend listening at port:${port}`)
})