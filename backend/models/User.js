const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
  role: {
    type: String,
    enum: ["worker", "family", "enterprise"],
  },
  emergencyContacts: [
    {
      name: String,
      phone: String, // Indian standard +91 length
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
