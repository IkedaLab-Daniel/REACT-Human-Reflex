const express = require("express");
const SerialPort = require("serialport").SerialPort;
const ReadlineParser = require("@serialport/parser-readline").ReadlineParser;
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/react_iot";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Reaction Test Schema
const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reactionTime: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Reaction = mongoose.model('Reaction', reactionSchema);

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "react-iot-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: false // set to true if using HTTPS
  }
}));

// Authentication Middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Serve static files
app.use(express.static("public"));
// Also serve a top-level /images folder (keeps images in project root accessible at /images/...)
app.use('/images', express.static('images'));

// Arduino Serial Connection
let port;
let parser;
let lastReaction = 0;
let powerState = false;

try {
  port = new SerialPort({
    path: "/dev/cu.usbserial-1120", // adjust for your system
    baudRate: 9600
  });

  parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", async (line) => {
    line = line.trim();
    
    if (line.startsWith("REACTION:")) {
      const value = parseInt(line.split(":")[1]);
      lastReaction = value;
      console.log("Reaction:", value);

      // Broadcast to all connected clients
      io.emit("reaction_time", value);
    }
    else if (line.startsWith("ACK:POWER_ON")) {
      powerState = true;
      console.log('Arduino ACK power ON');
      io.emit('power_state', powerState);
    } 
    else if (line.startsWith("ACK:POWER_OFF")) {
      powerState = false;
      console.log('Arduino ACK power OFF');
      io.emit('power_state', powerState);
    }
  });

  port.on('open', () => {
    console.log('✅ Serial port opened');
    port.write('POWER_OFF\n', (err) => {
      if (err) console.error('Failed to enforce POWER_OFF on open:', err);
      else console.log('Enforced POWER_OFF on Arduino');
    });
  });
} catch (err) {
  console.warn("⚠️  Arduino not connected. Running in demo mode.");
}

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current power state
  socket.emit('power_state', powerState);
  
  // Handle authentication over socket
  socket.on('authenticate', async (sessionData) => {
    try {
      if (sessionData && sessionData.userId) {
        socket.userId = sessionData.userId;
        
        // Send user's reaction history
        const reactions = await Reaction.find({ userId: sessionData.userId })
          .sort({ timestamp: -1 })
          .limit(50);
        
        socket.emit('history_loaded', reactions);
      }
    } catch (err) {
      console.error('Socket auth error:', err);
    }
  });
  
  // Save reaction time for authenticated user
  socket.on('save_reaction', async (reactionTime) => {
    if (!socket.userId) {
      return socket.emit('error', { message: 'Not authenticated' });
    }
    
    try {
      const reaction = new Reaction({
        userId: socket.userId,
        reactionTime: reactionTime
      });
      await reaction.save();
      socket.emit('reaction_saved', reaction);
    } catch (err) {
      console.error('Error saving reaction:', err);
      socket.emit('error', { message: 'Failed to save reaction' });
    }
  });
});

// ============= AUTH ROUTES =============

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Set session
    req.session.userId = user._id;
    
    res.json({ 
      success: true, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email 
      } 
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    
    // Find user
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Set session
    req.session.userId = user._id;
    
    res.json({ 
      success: true, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email 
      } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

// Get current user
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// ============= REACTION ROUTES =============

// Get user's reaction history
app.get("/api/reactions", requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const reactions = await Reaction.find({ userId: req.session.userId })
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json({ reactions });
  } catch (err) {
    console.error("Get reactions error:", err);
    res.status(500).json({ error: "Failed to get reactions" });
  }
});

// Save reaction time
app.post("/api/reactions", requireAuth, async (req, res) => {
  try {
    const { reactionTime } = req.body;
    
    if (!reactionTime || reactionTime < 0) {
      return res.status(400).json({ error: "Invalid reaction time" });
    }
    
    const reaction = new Reaction({
      userId: req.session.userId,
      reactionTime
    });
    
    await reaction.save();
    res.json({ success: true, reaction });
  } catch (err) {
    console.error("Save reaction error:", err);
    res.status(500).json({ error: "Failed to save reaction" });
  }
});

// Get user statistics
app.get("/api/stats", requireAuth, async (req, res) => {
  try {
    const reactions = await Reaction.find({ userId: req.session.userId });
    
    if (reactions.length === 0) {
      return res.json({ 
        total: 0, 
        average: 0, 
        best: 0, 
        worst: 0 
      });
    }
    
    const times = reactions.map(r => r.reactionTime);
    const total = reactions.length;
    const sum = times.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / total);
    const best = Math.min(...times);
    const worst = Math.max(...times);
    
    res.json({ total, average, best, worst });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// Delete a reaction
app.delete("/api/reactions/:id", requireAuth, async (req, res) => {
  try {
    const reaction = await Reaction.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    
    if (!reaction) {
      return res.status(404).json({ error: "Reaction not found" });
    }
    
    await Reaction.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: "Reaction deleted" });
  } catch (err) {
    console.error("Delete reaction error:", err);
    res.status(500).json({ error: "Failed to delete reaction" });
  }
});

// Get global leaderboard (top 50 users by best time)
app.get("/api/leaderboard", async (req, res) => {
  try {
    // Aggregate to get each user's best time
    const leaderboard = await Reaction.aggregate([
      {
        $group: {
          _id: "$userId",
          bestTime: { $min: "$reactionTime" },
          avgTime: { $avg: "$reactionTime" },
          totalTests: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          username: "$user.username",
          bestTime: 1,
          avgTime: { $round: ["$avgTime", 0] },
          totalTests: 1
        }
      },
      {
        $sort: { bestTime: 1 }
      },
      {
        $limit: 50
      }
    ]);
    
    res.json({ leaderboard });
  } catch (err) {
    console.error("Get leaderboard error:", err);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

// ============= ARDUINO CONTROL =============

app.post("/start", (req, res) => {
  if (!port) {
    return res.status(503).json({ error: "Arduino not connected" });
  }
  
  port.write("START\n", (err) => {
    if (err) {
      console.error("Error writing to Arduino:", err);
      return res.status(500).send("Failed");
    }
    console.log("Sent START to Arduino");
    res.send("OK");
  });
});

app.post("/power/:state", (req, res) => {
  if (!port) {
    return res.status(503).json({ error: "Arduino not connected" });
  }
  
  const state = req.params.state;
  let cmd;
  if (state === "on") cmd = "POWER_ON\n";
  else if (state === "off") cmd = "POWER_OFF\n";
  else return res.status(400).send("Invalid power state");

  port.write(cmd, (err) => {
    if (err) {
      console.error("Error writing power command:", err);
      return res.status(500).send("Failed");
    }
    powerState = (state === 'on');
    console.log("Sent", cmd.trim(), "(powerState=", powerState, ")");
    res.send("OK");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}`);
});