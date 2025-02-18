const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mysql = require('mysql');

// Load environment variables
dotenv.config();
const _dirname = path.resolve();

const app = express();

// Configure CORS to allow requests from any origin
app.use(cors({
  origin: '*',  // Be more restrictive in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(_dirname, "/frontend/dist")));

// Create MySQL connection pool with more detailed configuration
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || '192.168.238.84',
  user: process.env.DB_USER || 'boot',
  password: process.env.DB_PASSWORD || 'boot',
  database: process.env.DB_NAME || 'fun',
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000,
  waitForConnections: true,
  queueLimit: 0,
  debug: process.env.NODE_ENV !== 'production'
});

// Test database connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection refused. Please check if:');
      console.error('1. Database server is running');
      console.error('2. Database credentials are correct');
      console.error('3. Database host is accessible from this machine');
    }
    return;
  }
  console.log('Successfully connected to database');
  connection.release();
});

// Function to fetch jokes from database with better error handling
const fetchJokesFromDB = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting database connection:', err);
        reject(new Error('Database connection failed'));
        return;
      }

      connection.query('SELECT * FROM jokes', (error, results) => {
        connection.release();
        
        if (error) {
          console.error('Error executing query:', error);
          reject(new Error('Failed to fetch jokes'));
          return;
        }
        resolve(results);
      });
    });
  });
};

// API endpoint to fetch jokes
app.get('/post', async (req, res) => {
  try {
    const jokes = await fetchJokesFromDB();
    res.json(jokes);
  } catch (error) {
    console.error('Error fetching jokes:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Please try again later'
    });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.resolve(_dirname, "frontend", "dist", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Please try again later'
  });
});

const port = process.env.PORT || 3000;
app.listen(port,'0.0.0.0', () => {
  console.log(`Server running at http://192.168.238.84:${port}`);
});