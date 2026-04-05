import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

const userSchema = mongoose.Schema({
  name: String,
  username: {
    type: String,
    required: true,
  },
  email: String,
  googleId: String,
  role: {
    type: String,
    enum: ["viewer", "analyst", "admin"],
    required: true,
    default: "viewer",
  },
  createdAt: {
    type: Date,
    default: Date.now, 
  },
  totalIncome: Number,
  totalExpense: Number,
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
  ],
});

userSchema.plugin(passportLocalMongoose.default || passportLocalMongoose);

export default mongoose.model("user", userSchema);
