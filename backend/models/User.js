import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "customer",
  },
  // ✅ Profile Image Field එක එකතු කරන ලදී
  profileImage: {
    type: String,
    default: null, // Default value is null until an image is uploaded
  },
  // Note: LoyaltyPoints field එක rewards system එකට අවශ්‍ය නම් මෙහිදී add කළ හැකිය
  loyaltyPoints: {
    type: Number,
    default: 0,
  }
});

// Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
export default User;