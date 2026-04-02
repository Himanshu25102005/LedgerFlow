import mongoose from "mongoose";

const transactionSchema = mongoose.Schema({
  amount: Number,
  Type: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },
  date:{
    type: Date, 
    default: Date.now()
  },
  notes: String, 
  category: String, 
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  }
});

module.exports = mongoose.model("transactionSchema", transactionSchema);
