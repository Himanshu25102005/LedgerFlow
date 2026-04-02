import mongoose from "mongoose";
import plm from "passport-local-mongoose";
const plm = require("passport-local-mongoose").default;

const userSchema = mongoose.Schema({
  name: String, 
  username: {
    type:String, 
    required: true, 
  },
  password: String, 
  email: String,
  googleId: String,
  role: {
    type: String,
    enum: ["viewer", "analyst", "admin"],
    required: true,
  },
  createdAt:{
    type: Date,
    default: Date.now()
  },
  totalIncome: Number,
  totalExpense: Number,  
  isActive:{
    type: Boolean,
    default: false,
  },
  transactions:[{
    type:mongoose.Schema.Types.ObjectId,
    ref: "transaction"
  }]
});

userSchema.plugin(plm);
module.exports = mongoose.model("user", userSchema);
