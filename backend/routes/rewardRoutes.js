// routes/rewardRoutes.js

import express from 'express';
// Controller functions නිවැරදිව import කරන්න
import { playDailyReward, getDailyPlayStatus } from '../controllers/rewardController.js'; 
import { protect } from '../models/authMiddleware.js'; 

const rewardRouter = express.Router();

rewardRouter.get('/status', protect, getDailyPlayStatus);
rewardRouter.post('/play', protect, playDailyReward);

export default rewardRouter;