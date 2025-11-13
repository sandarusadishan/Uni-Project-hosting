// server.js (සර්ව සම්පූර්ණ කෝඩ්)

import express from "express";
import mongoose from "mongoose";
import { createServer } from 'http'; // ✅ HTTP server සෑදීමට
import { Server } from 'socket.io'; // ✅ Socket.IO Server
import userRouter from "./routes/userRouter.js";
import productRouter from "./routes/productRouter.js";
import orderRouter from "./routes/orderRouter.js"; 
import rewardRouter from "./routes/rewardRoutes.js"; // ✅ Rewards Router
import User from "./models/User.js"; 
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url'; // ✅ Path handling සඳහා

const __filename = fileURLToPath(import.meta.url); // ✅ වත්මන් ගොනුවේ path එක ලබාගැනීම
const __dirname = path.dirname(__filename); // ✅ වත්මන් directory එකේ path එක ලබාගැනීම

dotenv.config();

const app = express();
const httpServer = createServer(app); // ✅ Express app එකෙන් HTTP server එකක් සාදයි
const io = new Server(httpServer, { // ✅ Socket.IO server එක සාදයි
  cors: {
    origin: "http://localhost:5173", // Frontend URL (Vite default)
    methods: ["GET", "POST"]
  }
});
const monogourl = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

// ✅ Admin user නිර්මාණය කිරීමේ function එක
const seedAdminUser = async () => {
  try {
    const adminUser = await User.findOne({ email: 'admin@burger.com' });
    if (!adminUser) {
      await User.create({
        name: 'Admin',
        email: 'admin@burger.com',
        password: 'admin123', // 🚨 අවවාදයයි: මෙය hash කළ යුතුය!
        role: 'admin',
      });
      console.log('Admin user created');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

mongoose.connect(monogourl).then(() => {
  console.log("Database Connected");
  seedAdminUser(); // ✅ Database connection එකෙන් පසුව admin user නිර්මාණය කිරීම
}).catch((err) => console.error("Database connection error:", err));

app.use(cors());
app.use(express.json()); 

// ✅ Socket.IO instance එක controllers වලට access කිරීමට middleware එකක්
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ Socket.IO connection logic
io.on('connection', (socket) => {
  console.log('A user connected via WebSocket:', socket.id);

  // Admin dashboard එකෙන් එවන event එකට සවන් දීම
  socket.on('join_admin_room', () => {
      console.log(`Socket ${socket.id} joined the admin room.`);
      socket.join('admin_room'); // Admin-only කාමරයකට join වීම
  });
});

// 🖼️ Static Files Serving Setup 
// public folder එක root path (/) එකෙන් සර්ව් කිරීම (logo.png සඳහා)
app.use('/public', express.static(path.join(__dirname, 'public')));

// uploads folder (profiles, products) සර්ව් කිරීම
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter); 
app.use("/api/rewards", rewardRouter); // ✅ Rewards Route එක register කර ඇත

// ✅ app.listen වෙනුවට httpServer.listen භාවිතා කිරීම
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});