// server.js

// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); // Library for password hashing
const cors = require('cors'); // Import cors to allow cross-origin requests

// Initialize Express app
const app = express();
const PORT = 3000;

// Middleware to parse JSON request bodies
app.use(bodyParser.json());
// Enable CORS for all routes - IMPORTANT for frontend to access this backend
app.use(cors());

// In-memory "database" for users (for demonstration purposes only)
// In a real application, this would be a persistent database (e.g., PostgreSQL, MongoDB)
const users = []; // Stores objects like { username: 'testuser', passwordHash: 'hashed_password' }

// --- User Authentication Endpoints ---

/**
 * Endpoint for user registration
 * Method: POST
 * Path: /register
 * Request Body: { "username": "your_username", "password": "your_password" }
 */
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Basic input validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  // Check if user already exists
  if (users.find(user => user.username === username)) {
    return res.status(409).json({ message: 'Username already taken.' });
  }

  try {
    // Hash the password before storing it
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Store the new user in our "database"
    users.push({ username, passwordHash });
    console.log('Registered users:', users); // Log users for debugging

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

/**
 * Endpoint for user login
 * Method: POST
 * Path: /login
 * Request Body: { "username": "your_username", "password": "your_password" }
 */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Basic input validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  // Find the user in our "database"
  const user = users.find(u => u.username === username);

  // Check if user exists
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  try {
    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (isPasswordValid) {
      res.status(200).json({ message: 'Login successful!', user: { username: user.username } });
    } else {
      res.status(401).json({ message: 'Invalid username or password.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});


// --- Job Board Data and Endpoint ---

// Job Board data (as provided by the user)
const jobs = [
    // USA jobs from Google search (examples)
    {
        id: 9,
        title: "Part-Time Retail Associate",
        company: "Target",
        category: "retail",
        pay: 15,
        location: "New York, NY",
        country: "United States",
        description: "Assist customers, stock shelves, and operate cash registers. Flexible hours for students.",
        requirements: "High school diploma or equivalent, strong communication skills",
        contact: "careers@target.com",
        posted: "2 days ago"
        },
        {
        id: 10,
        title: "Student Administrative Assistant",
        company: "University of California, Los Angeles",
        category: "campus",
        pay: 17,
        location: "Los Angeles, CA",
        country: "United States",
        description: "Support office staff with filing, scheduling, and data entry. Great for students seeking office experience.",
        requirements: "Current UCLA student, basic computer skills",
        contact: "jobs@ucla.edu",
        posted: "3 days ago"
        },
        {
        id: 11,
        title: "Food Service Worker",
        company: "Aramark",
        category: "food",
        pay: 14,
        location: "Chicago, IL",
        country: "United States",
        description: "Serve food, maintain cleanliness, and assist with kitchen prep in a university dining hall.",
        requirements: "Ability to stand for long periods, team player",
        contact: "apply@aramark.com",
        posted: "1 day ago"
        },
        {
        id: 12,
        title: "Remote Data Entry Clerk",
        company: "Kelly Services",
        category: "remote",
        pay: 16,
        location: "Remote",
        country: "United States",
        description: "Enter and update data for various clients. Work from home, ideal for students with good typing skills.",
        requirements: "Attention to detail, reliable internet connection",
        contact: "jobs@kellyservices.com",
        posted: "4 days ago"
        },
        {
        id: 13,
        title: "Delivery Driver",
        company: "DoorDash",
        category: "delivery",
        pay: 20,
        location: "Houston, TX",
        country: "United States",
        description: "Deliver food orders to customers using your car or bike. Flexible scheduling and weekly pay.",
        requirements: "Valid driver's license, smartphone",
        contact: "support@doordash.com",
        posted: "Today"
        },
        {
        id: 14,
        title: "Peer Tutor",
        company: "Boston University",
        category: "tutoring",
        pay: 18,
        location: "Boston, MA",
        country: "United States",
        description: "Tutor fellow students in math, science, or writing. Set your own hours and help others succeed.",
        requirements: "Current BU student, GPA 3.0+",
        contact: "tutoring@bu.edu",
        posted: "2 days ago"
        }
        ,
        {
        id: 15,
        title: "Library Assistant",
        company: "New York Public Library",
        category: "campus",
        pay: 13,
        location: "New York, NY",
        country: "United States",
        description: "Help organize books, assist patrons, and support library events.",
        requirements: "Attention to detail, customer service skills",
        contact: "jobs@nypl.org",
        posted: "1 day ago"
        },
        {
        id: 16,
        title: "Barista",
        company: "Starbucks",
        category: "food",
        pay: 14,
        location: "Seattle, WA",
        country: "United States",
        description: "Prepare coffee and beverages, serve customers, and maintain cleanliness.",
        requirements: "Friendly attitude, ability to multitask",
        contact: "careers@starbucks.com",
        posted: "Today"
        },
        {
        id: 17,
        title: "Campus Tour Guide",
        company: "University of Michigan",
        category: "campus",
        pay: 15,
        location: "Ann Arbor, MI",
        country: "United States",
        description: "Lead prospective students and families on campus tours.",
        requirements: "Outgoing personality, current student",
        contact: "admissions@umich.edu",
        posted: "3 days ago"
        },
        {
        id: 18,
        title: "IT Help Desk Assistant",
        company: "Georgia Tech",
        category: "campus",
        pay: 16,
        location: "Atlanta, GA",
        country: "United States",
        description: "Assist students and staff with basic IT issues and troubleshooting.",
        requirements: "Basic computer knowledge, communication skills",
        contact: "itjobs@gatech.edu",
        posted: "2 days ago"
        },
        {
        id: 19,
        title: "Freelance Graphic Designer",
        company: "Fiverr",
        category: "remote",
        pay: 25,
        location: "Remote",
        country: "United States",
        description: "Create logos, flyers, and digital graphics for clients online.",
        requirements: "Portfolio, design software skills",
        contact: "support@fiverr.com",
        posted: "Today"
        },
        {
        id: 20,
        title: "Babysitter",
        company: "Care.com",
        category: "delivery",
        pay: 18,
        location: "Dallas, TX",
        country: "United States",
        description: "Supervise and care for children during evenings and weekends.",
        requirements: "Experience with children, references",
        contact: "jobs@care.com",
        posted: "Yesterday"
        },
        {
        id: 21,
        title: "Warehouse Associate",
        company: "Amazon",
        category: "retail",
        pay: 17,
        location: "Phoenix, AZ",
        country: "United States",
        description: "Pick, pack, and ship orders in a fast-paced warehouse environment.",
        requirements: "Ability to lift 50 lbs, punctuality",
        contact: "jobs@amazon.com",
        posted: "2 days ago"
        },
        {
        id: 22,
        title: "Social Media Assistant",
        company: "SocialBee",
        category: "remote",
        pay: 15,
        location: "Remote",
        country: "United States",
        description: "Schedule posts, engage with followers, and track analytics.",
        requirements: "Familiarity with social platforms, writing skills",
        contact: "hr@socialbee.com",
        posted: "Today"
        },
        {
        id: 23,
        title: "Dog Walker",
        company: "Rover",
        category: "delivery",
        pay: 20,
        location: "San Diego, CA",
        country: "United States",
        description: "Walk and care for dogs in your local area.",
        requirements: "Love for animals, reliable transportation",
        contact: "jobs@rover.com",
        posted: "3 days ago"
        },
        {
        id: 24,
        title: "Math Tutor",
        company: "Varsity Tutors",
        category: "tutoring",
        pay: 22,
        location: "Remote",
        country: "United States",
        description: "Tutor K-12 and college students in math subjects online.",
        requirements: "Strong math background, teaching skills",
        contact: "jobs@varsitytutors.com",
        posted: "Today"
        },
        {
        id: 25,
        title: "Event Staff",
        company: "Eventbrite",
        category: "retail",
        pay: 16,
        location: "Miami, FL",
        country: "United States",
        description: "Assist with event setup, guest check-in, and logistics.",
        requirements: "Friendly demeanor, ability to stand for long periods",
        contact: "jobs@eventbrite.com",
        posted: "Yesterday"
        },
        {
        id: 26,
        title: "Research Assistant",
        company: "Stanford University",
        category: "campus",
        pay: 19,
        location: "Stanford, CA",
        country: "United States",
        description: "Support faculty with research, data entry, and literature reviews.",
        requirements: "Current student, research interest",
        contact: "hr@stanford.edu",
        posted: "2 days ago"
        },
        {
        id: 27,
        title: "Food Delivery Biker",
        company: "Uber Eats",
        category: "delivery",
        pay: 18,
        location: "Philadelphia, PA",
        country: "United States",
        description: "Deliver food orders by bike, set your own schedule.",
        requirements: "Bike, smartphone",
        contact: "support@uber.com",
        posted: "Today"
        },
        {
        id: 28,
        title: "Online English Tutor",
        company: "VIPKid",
        category: "tutoring",
        pay: 20,
        location: "Remote",
        country: "United States",
        description: "Teach English to children overseas via video chat.",
        requirements: "Fluent English, teaching experience preferred",
        contact: "jobs@vipkid.com",
        posted: "1 day ago"
        },
        {
        id: 29,
        title: "Cashier",
        company: "Walmart",
        category: "retail",
        pay: 13,
        location: "Orlando, FL",
        country: "United States",
        description: "Operate cash register, assist customers, and restock shelves.",
        requirements: "Customer service skills, reliability",
        contact: "careers@walmart.com",
        posted: "Yesterday"
        },
        {
        id: 30,
        title: "Fitness Center Attendant",
        company: "YMCA",
        category: "campus",
        pay: 14,
        location: "Denver, CO",
        country: "United States",
        description: "Monitor gym, assist members, and maintain equipment.",
        requirements: "Interest in fitness, CPR certification a plus",
        contact: "jobs@ymca.org",
        posted: "2 days ago"
        },
        {
        id: 31,
        title: "Remote Customer Service Rep",
        company: "Liveops",
        category: "remote",
        pay: 16,
        location: "Remote",
        country: "United States",
        description: "Answer calls and assist customers from home.",
        requirements: "Good communication, computer with internet",
        contact: "jobs@liveops.com",
        posted: "Today"
        },
        {
        id: 32,
        title: "Bookstore Clerk",
        company: "Barnes & Noble",
        category: "retail",
        pay: 14,
        location: "San Francisco, CA",
        country: "United States",
        description: "Assist customers, organize books, and operate register.",
        requirements: "Love of books, customer service skills",
        contact: "jobs@barnesandnoble.com",
        posted: "Yesterday"
        },
        {
        id: 33,
        title: "Residence Hall Assistant",
        company: "Ohio State University",
        category: "campus",
        pay: 15,
        location: "Columbus, OH",
        country: "United States",
        description: "Support students in residence halls and help organize activities.",
        requirements: "Current student, leadership skills",
        contact: "housing@osu.edu",
        posted: "3 days ago"
        },
        {
        id: 34,
        title: "Remote Survey Taker",
        company: "Survey Junkie",
        category: "remote",
        pay: 12,
        location: "Remote",
        country: "United States",
        description: "Take online surveys and earn money from home.",
        requirements: "Internet access, attention to detail",
        contact: "support@surveyjunkie.com",
        posted: "Today"
        },
        {
        id: 35,
        title: "Catering Staff",
        company: "Sodexo",
        category: "food",
        pay: 15,
        location: "Austin, TX",
        country: "United States",
        description: "Assist with food prep and service at campus events.",
        requirements: "Team player, food safety knowledge",
        contact: "jobs@sodexo.com",
        posted: "2 days ago"
        }
];

/**
 * Endpoint to get all job listings.
 * Method: GET
 * Path: /jobs
 */
app.get('/jobs', (req, res) => {
  res.status(200).json(jobs);
});


// Start the server
app.listen(PORT, () => {
  console.log(`Node.js backend listening on http://localhost:${PORT}`);
  console.log('Use POST requests to /register and /login');
  console.log('Use GET requests to /jobs to retrieve job listings');
});
