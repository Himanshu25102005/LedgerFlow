import mongoose from "mongoose";

const recordSchema = mongoose.Schema({
  amount: Number,
  Type: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  notes: String,
  category: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
});

module.exports = mongoose.model("recordSchema", recordSchema);
