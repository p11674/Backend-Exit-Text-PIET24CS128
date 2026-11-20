const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");

dotenv.config();

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: "Too many requests. Try again later."
  })
);

// Student Schema
const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["student", "admin"],
    default: "student"
  }
});

const Student = mongoose.model("Student", studentSchema);

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access denied. Token required."
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid or expired token."
      });
    }

    req.user = user;
    next();
  });
}

// Admin Middleware
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access only."
    });
  }
  next();
}

// Student Registration
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    const existingStudent = await Student.findOne({ email });

    if (existingStudent) {
      return res.status(409).json({
        message: "Email already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Student registered successfully.",
      student: {
        id: student._id,
        name: student.name,
        email: student.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed.",
      error: error.message
    });
  }
});

// Student Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      student.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        id: student._id,
        role: student.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful.",
      token
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed.",
      error: error.message
    });
  }
});

// Protected Profile Route
app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .select("-password");

    if (!student) {
      return res.status(404).json({
        message: "Student not found."
      });
    }

    res.json({
      message: "Profile accessed successfully.",
      student
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error."
    });
  }
});

// Admin Only: View All Students
app.get(
  "/students",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const students = await Student.find().select("-password");
      res.json({
        message: "Students fetched successfully.",
        students
      });
    } catch (error) {
      res.status(500).json({
        message: "Unable to fetch students."
      });
    }
  }
);

// Server and Database Connection
const PORT = process.env.PORT || 3001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully.");
    app.listen(PORT, () => {
      console.log(`Student Portal running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });