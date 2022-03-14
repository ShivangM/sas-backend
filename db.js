require('dotenv').config();
const connectionString = process.env.DATABASE_URL

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

module.exports = {
  query: (text, params) => pool.query(text, params),
}