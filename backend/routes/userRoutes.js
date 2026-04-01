const express = require("express");
const router = express.Router();

const User = require("../models/User");

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });

    if (exists) {
      return res.status(400).json({
        message: "User with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ message: "Signup failed" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
});

// GET CONTACTS
router.get("/contacts/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.emergencyContacts || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

// ADD CONTACT
router.post("/contacts/:id", async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.emergencyContacts.push({ name, phone });
    await user.save();

    res.json(user.emergencyContacts);
  } catch (err) {
    res.status(500).json({ message: "Failed to add contact" });
  }
});

// DELETE CONTACT
router.delete("/contacts/:id/:contactId", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.emergencyContacts = user.emergencyContacts.filter(
      (c) => c._id.toString() !== req.params.contactId
    );
    await user.save();

    res.json(user.emergencyContacts);
  } catch (err) {
    res.status(500).json({ message: "Failed to delete contact" });
  }
});

module.exports = router;
