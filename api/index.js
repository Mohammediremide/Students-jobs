// api/index.js

const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

let dbReady = false;
async function initDb() {
  if (dbReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      security_question TEXT,
      security_answer TEXT,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      category TEXT NOT NULL,
      pay INTEGER NOT NULL,
      location TEXT NOT NULL,
      country TEXT,
      description TEXT,
      requirements TEXT,
      contact TEXT,
      posted TEXT,
      apply_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  dbReady = true;
}

const defaultJobs = [

async function seedJobsIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM jobs');
  if (rows[0].count > 0) return;
  const insertText = `
    INSERT INTO jobs
    (title, company, category, pay, location, country, description, requirements, contact, posted, apply_url)
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `;
  for (const job of defaultJobs) {
    await pool.query(insertText, [
      job.title,
      job.company,
      job.category,
      job.pay,
      job.location,
      job.country || 'United States',
      job.description || '',
      job.requirements || '',
      job.contact || '',
      job.posted || '',
      job.applyUrl || null
    ]);
  }
}

app.post('/register', async (req, res) => {
  const { email, password, securityQuestion, securityAnswer } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    await initDb();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already taken.' });
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const isAdmin = email === 'admin@brexbin.com';
    await pool.query(
      `INSERT INTO users (email, password_hash, security_question, security_answer, is_admin)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, passwordHash, securityQuestion || null, securityAnswer || null, isAdmin]
    );
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    await initDb();
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, is_admin FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (isPasswordValid) {
      res.status(200).json({
        message: 'Login successful!',
        user: { email: user.email, isAdmin: user.is_admin === true }
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

app.get('/jobs', (req, res) => {
  (async () => {
    try {
      await initDb();
      await seedJobsIfEmpty();
      const { rows } = await pool.query(
        `SELECT id, title, company, category, pay, location, country,
                description, requirements, contact, posted, apply_url
         FROM jobs
         ORDER BY id DESC`
      );
      const jobs = rows.map(r => ({
        id: r.id,
        title: r.title,
        company: r.company,
        category: r.category,
        pay: r.pay,
        location: r.location,
        country: r.country,
        description: r.description,
        requirements: r.requirements,
        contact: r.contact,
        posted: r.posted,
        applyUrl: r.apply_url
      }));
      res.status(200).json(jobs);
    } catch (error) {
      console.error('Jobs fetch error:', error);
      res.status(500).json({ message: 'Server error during jobs fetch.' });
    }
  })();
});

app.post('/jobs', async (req, res) => {
  const job = req.body || {};
  if (!job.title || !job.company || !job.category || !job.pay || !job.location) {
    return res.status(400).json({ message: 'Missing required job fields.' });
  }
  try {
    await initDb();
    const { rows } = await pool.query(
      `INSERT INTO jobs
       (title, company, category, pay, location, country, description, requirements, contact, posted, apply_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, title, company, category, pay, location, country, description, requirements, contact, posted, apply_url`,
      [
        job.title,
        job.company,
        job.category,
        job.pay,
        job.location,
        job.country || 'United States',
        job.description || '',
        job.requirements || '',
        job.contact || '',
        job.posted || '',
        job.applyUrl || null
      ]
    );
    const saved = rows[0];
    res.status(201).json({
      id: saved.id,
      title: saved.title,
      company: saved.company,
      category: saved.category,
      pay: saved.pay,
      location: saved.location,
      country: saved.country,
      description: saved.description,
      requirements: saved.requirements,
      contact: saved.contact,
      posted: saved.posted,
      applyUrl: saved.apply_url
    });
  } catch (error) {
    console.error('Jobs create error:', error);
    res.status(500).json({ message: 'Server error during job create.' });
  }
});

module.exports = app;
