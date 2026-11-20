const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

// Book Schema
const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    price: { type: Number, min: 1, required: true },
    category: String,
    isAvailable: { type: Boolean, default: true }
});

const Book = mongoose.model("Book", bookSchema);

// POST - Add Book
app.post("/books", async (req, res, next) => {
    try {
        const book = await Book.create(req.body);
        res.status(201).json(book);
    } catch (err) {
        next(err);
    }
});

// GET - All Books
app.get("/books", async (req, res, next) => {
    try {
        const books = await Book.find();
        res.status(200).json(books);
    } catch (err) {
        next(err);
    }
});

// GET - Single Book
app.get("/books/:id", async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        res.status(200).json(book);
    } catch (err) {
        next(err);
    }
});

// PUT - Update Book
app.put("/books/:id", async (req, res, next) => {
    try {
        const book = await Book.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.status(200).json(book);
    } catch (err) {
        next(err);
    }
});

// DELETE - Delete Book
app.delete("/books/:id", async (req, res, next) => {
    try {
        const book = await Book.findByIdAndDelete(req.params.id);

        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.status(200).json({ message: "Book deleted successfully" });
    } catch (err) {
        next(err);
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(err.name === "ValidationError" ? 400 : 500)
       .json({ message: err.message });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
        app.listen(3000, () => {
            console.log("Server running on port 3000");
        });
    })
    .catch(err => console.log(err));