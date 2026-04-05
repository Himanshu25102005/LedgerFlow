import mongoose from "mongoose";

const recordSchema = mongoose.Schema({
  amount: Number,
  type: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now, 
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


export default mongoose.model("record", recordSchema);