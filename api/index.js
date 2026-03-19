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
      source_name TEXT,
      source_url TEXT,
      source_guid TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_name TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_url TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_guid TEXT UNIQUE;`);
  dbReady = true;
}

const defaultJobs = [];

async function fetchHimalayasJobs(maxJobs) {
  const pageSize = 20;
  let offset = 0;
  let all = [];
  while (all.length < maxJobs) {
    const res = await fetch(`https://himalayas.app/jobs/api?offset=${offset}&limit=${pageSize}`);
    if (!res.ok) break;
    const data = await res.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    if (jobs.length === 0) break;
    all = all.concat(jobs);
    offset += pageSize;
    if (data.totalCount !== undefined && offset >= data.totalCount) break;
  }
  return all.slice(0, maxJobs);
}

async function seedJobsIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM jobs');
  if (rows[0].count > 0) return;
  const maxJobs = parseInt(process.env.MAX_JOBS || '60', 10);
  let sourceJobs = [];
  try {
    sourceJobs = await fetchHimalayasJobs(maxJobs);
  } catch (error) {
    console.error('Himalayas fetch error:', error);
  }
  const insertText = `
    INSERT INTO jobs
    (title, company, category, pay, location, country, description, requirements, contact, posted, apply_url, source_name, source_url, source_guid)
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (source_guid) DO NOTHING
  `;
  for (const job of sourceJobs) {
    const salaryLabel = job.minSalary && job.maxSalary
      ? `${job.currency} ${job.minSalary} - ${job.maxSalary}`
      : '';
    const requirements = [
      job.employmentType ? `Type: ${job.employmentType}` : '',
      job.seniority ? `Seniority: ${job.seniority}` : '',
      salaryLabel ? `Salary: ${salaryLabel}` : '',
      Array.isArray(job.categories) && job.categories.length ? `Categories: ${job.categories.join(', ')}` : ''
    ].filter(Boolean).join(' | ');
    const country = Array.isArray(job.locationRestrictions) && job.locationRestrictions.length
      ? job.locationRestrictions.map(c => c.name).join(', ')
      : 'Worldwide';
    const posted = job.pubDate ? new Date(job.pubDate).toISOString() : '';
    await pool.query(insertText, [
      job.title || 'Remote role',
      job.companyName || 'Unknown',
      (Array.isArray(job.parentCategories) && job.parentCategories[0]) || (Array.isArray(job.categories) && job.categories[0]) || 'remote',
      0,
      'Remote',
      country,
      job.excerpt || '',
      requirements,
      '',
      posted,
      job.applicationLink || null,
      'Himalayas',
      'https://himalayas.app',
      job.guid || null
    ]);
  }

  if (defaultJobs.length) {
    const insertDefault = `
      INSERT INTO jobs
      (title, company, category, pay, location, country, description, requirements, contact, posted, apply_url)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `;
    for (const job of defaultJobs) {
      await pool.query(insertDefault, [
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

app.post('/reset-password/start', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  try {
    await initDb();
    const { rows } = await pool.query(
      'SELECT security_question FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'No account found with that email.' });
    }
    res.status(200).json({ securityQuestion: user.security_question || '' });
  } catch (error) {
    console.error('Reset start error:', error);
    res.status(500).json({ message: 'Server error during reset.' });
  }
});

app.post('/reset-password/complete', async (req, res) => {
  const { email, securityAnswer, newPassword } = req.body || {};
  if (!email || !securityAnswer || !newPassword) {
    return res.status(400).json({ message: 'Email, answer, and new password are required.' });
  }
  try {
    await initDb();
    const { rows } = await pool.query(
      'SELECT id, security_answer FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'No account found with that email.' });
    }
    const expected = (user.security_answer || '').toLowerCase().trim();
    if (expected && expected !== securityAnswer.toLowerCase().trim()) {
      return res.status(401).json({ message: 'Incorrect security answer.' });
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
    res.status(200).json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('Reset complete error:', error);
    res.status(500).json({ message: 'Server error during reset.' });
  }
});

app.get('/jobs', (req, res) => {
  (async () => {
    try {
      await initDb();
      if (req.query.refresh === '1') {
        await pool.query('DELETE FROM jobs');
      }
      await seedJobsIfEmpty();
      const { rows } = await pool.query(
        `SELECT id, title, company, category, pay, location, country,
                description, requirements, contact, posted, apply_url, source_name, source_url, created_at
         FROM jobs
         ORDER BY id DESC`
      );
      const jobs = rows.map(r => ({
        id: r.id,
        title: r.title,
        company: r.company,
        category: r.category,
        pay: r.pay,
        salaryLabel: r.requirements && r.requirements.includes('Salary:') ? r.requirements.split('Salary:')[1].split('|')[0].trim() : '',
        location: r.location,
        country: r.country,
        description: r.description,
        requirements: r.requirements,
        contact: r.contact,
        posted: r.posted || (r.created_at ? new Date(r.created_at).toISOString() : ''),
        applyUrl: r.apply_url,
        sourceName: r.source_name,
        sourceUrl: r.source_url
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
       (title, company, category, pay, location, country, description, requirements, contact, posted, apply_url, source_name, source_url, source_guid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id, title, company, category, pay, location, country, description, requirements, contact, posted, apply_url, source_name, source_url`,
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
        job.applyUrl || null,
        job.sourceName || null,
        job.sourceUrl || null,
        job.sourceGuid || null
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
      applyUrl: saved.apply_url,
      sourceName: saved.source_name,
      sourceUrl: saved.source_url
    });
  } catch (error) {
    console.error('Jobs create error:', error);
    res.status(500).json({ message: 'Server error during job create.' });
  }
});

module.exports = app;
