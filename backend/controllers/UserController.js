// controllers/UserController.js

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Token Generation ---
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// --- Multer Setup for Profile Pictures ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Project root directory එකේ uploads/profiles වෙත යොමු කරයි.
    const uploadDir = path.join(process.cwd(), 'uploads/profiles/');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    const userId = req.params.id || req.body._id || 'unknown'; 
    cb(null, `profile-${userId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

export const uploadProfilePic = multer({ 
  storage: storage,
  limits: { fileSize: 2000000 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: Profile picture must be JPEG, JPG, or PNG."));
  }
}).single('profilePic');

// Utility to delete the old image file
const deleteOldImage = async (user) => {
    if (user && user.profileImage) {
        // user.profileImage e.g., /uploads/profiles/filename.png
        const oldImagePath = path.join(process.cwd(), user.profileImage); 
        
        if (fs.existsSync(oldImagePath)) {
            fs.unlink(oldImagePath, (err) => {
                if (err) console.error("Error deleting old profile image:", err);
            });
        }
    }
};

// --- Auth Functions (Login/Register) ---

export const createUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = await User.create({ name, email, password });
    if (user) {
      const { password: _, ...userPayload } = user.toObject();
      res.status(201).json({ ...userPayload, token: generateToken(user._id) });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const userPayload = {
        _id: user._id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage
      };
      res.json({ ...userPayload, token: generateToken(user._id) });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// --- User Update (Profile Edit) ---

export const updateUser = (req, res) => {
  uploadProfilePic(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Profile picture upload failed." });
    }

    const userId = req.params.id;
    const { name, email, role } = req.body; 
    let updateData = { name, email };
    
    if (role) { 
        updateData.role = role;
    }

    try {
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        if (req.file) fs.unlink(req.file.path, (unlinkErr) => {});
        return res.status(404).json({ message: "User not found." });
      }
      
      // ✅ Profile Picture Update
      if (req.file) {
        await deleteOldImage(existingUser);
        // DB eke save karana path eka (mekaṭa thamai client eken access karanne)
        updateData.profileImage = `/uploads/profiles/${req.file.filename}`; 
      }
      
      if (!role) {
          delete updateData.role; 
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select('-password');

      res.status(200).json({ 
          message: "User profile updated successfully.", 
          user: updatedUser 
      });

    } catch (error) {
      if (req.file) fs.unlink(req.file.path, (unlinkErr) => {});
      console.error("DB Update Error:", error);
      if (error.code === 11000) {
          return res.status(409).json({ message: "Email already in use." });
      }
      res.status(500).json({ message: "Server error during profile update." });
    }
  });
};

// --- Password Change ---
export const changePassword = async (req, res) => {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Please provide current and new passwords." });
    }

    try {
        const user = await User.findById(userId).select('+password'); 

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(401).json({ message: "Incorrect current password." });
        }

        user.password = newPassword; 
        await user.save();

        res.status(200).json({ message: "Password updated successfully!" });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ message: "Server error while changing password." });
    }
};


// --- Admin/General Read/Delete Functions ---

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); 
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error retrieving users" });
  }
};

export const getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error retrieving user" });
  }
};

export const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const userToDelete = await User.findById(userId);

        if (!userToDelete) {
            return res.status(404).json({ message: "User not found" });
        }
        await deleteOldImage(userToDelete);
        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: "User successfully deleted" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: "Server error during user deletion" });
    }
};

// --- Remove Profile Image ---
export const removeProfileImage = async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Delete the physical image file
        await deleteOldImage(user);

        // Remove the image path from the database
        user.profileImage = null;
        const updatedUser = await user.save();

        res.status(200).json({
            message: "Profile image removed successfully.",
            user: updatedUser.toObject() // Send back the updated user
        });

    } catch (error) {
        res.status(500).json({ message: "Server error while removing profile image." });
    }
};