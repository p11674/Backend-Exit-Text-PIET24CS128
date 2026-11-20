const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");

dotenv.config();

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

// Student Schema
const studentSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },
  password: String,
  role: {
    type: String,
    default: "student"
  }
});

const Student = mongoose.model("Student", studentSchema);

// JWT Authentication Middleware
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

// Admin Authorization Middleware
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only."
    });
  }

  next();
}

// Protected Student Profile
app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .select("-password");

    if (!student) {
      return res.status(404).json({
        message: "Student not found."
      });
    }

    res.status(200).json({
      message: "Profile accessed successfully.",
      student: student
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error."
    });
  }
});

// Admin Only: Get All Students
app.get(
  "/students",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const students = await Student.find()
        .select("-password");

      res.status(200).json({
        message: "All students fetched successfully.",
        totalStudents: students.length,
        students: students
      });
    } catch (error) {
      res.status(500).json({
        message: "Unable to fetch students."
      });
    }
  }
);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(500).json({
    message: "Something went wrong."
  });
});

// Database Connection
const PORT = 3002;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`Protected Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Database connection failed:", error.message);
  });