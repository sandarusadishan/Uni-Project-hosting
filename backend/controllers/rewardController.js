// controllers/rewardController.js (සම්පූර්ණ කෝඩ්)

import RewardPlay from '../models/RewardPlay.js'; 
import Coupon from '../models/Coupon.js'; 
import mongoose from 'mongoose';


// --- Game Configuration (Backend එකේදී prizes වල details තබා ගත යුතුය) ---
const PRIZES_CONFIG = [
  { name: 'LKR 100 OFF', type: 'win', description: 'A small boost!', discount: { type: 'flat', value: 100 } },
  { name: 'FREE DRINK', type: 'win', description: 'Enjoy a free drink!', discount: { type: 'free_item', value: 1 } },
  { name: '5% OFF', type: 'win', description: 'Get 5% off!', discount: { type: 'percentage', value: 0.05 } },
  { name: 'TRY AGAIN', type: 'lose', description: 'Better luck tomorrow!', discount: null },
];


export const playDailyReward = async (req, res) => {
    const userId = req.user._id; 

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. දිනපතා සීමාව පරීක්ෂා කිරීම
        const userPlay = await RewardPlay.findOne({ user: userId });
        
        if (userPlay) {
            const lastPlayed = new Date(userPlay.lastPlayedDate);
            lastPlayed.setHours(0, 0, 0, 0);

            if (lastPlayed.getTime() === today.getTime()) {
                return res.status(400).json({ message: 'Daily reward already claimed today.' });
            }
        }

        // 2. ත්‍යාගය තෝරා ගැනීම
        const winningIndex = Math.floor(Math.random() * PRIZES_CONFIG.length);
        const finalResult = PRIZES_CONFIG[winningIndex];

        let couponCode = null;

        // 3. Coupon Code එක සාදා Database එකේ ගබඩා කිරීම
        if (finalResult.type === 'win') {
            const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            couponCode = `${finalResult.name.replace(/ /g, '_').toUpperCase().slice(0, 8)}-${uniqueSuffix}`;

            await Coupon.create({
                code: couponCode,
                prizeName: finalResult.name,
                discountType: finalResult.discount.type,
                value: finalResult.discount.value,
                assignedTo: userId,
            });
        }

        // 4. RewardPlay දත්ත ගබඩාව යාවත්කාලීන කිරීම (Update/Create)
        const updateData = {
            lastPlayedDate: new Date(),
            lastPrize: finalResult.name
        };

        if (userPlay) {
            await RewardPlay.updateOne({ user: userId }, updateData);
        } else {
            await RewardPlay.create({ user: userId, ...updateData });
        }
        
        // 5. Frontend වෙත ප්‍රතිඵලය යැවීම
        res.json({ 
            success: true, 
            prize: { ...finalResult, code: couponCode || null, description: finalResult.description } 
        });

    } catch (error) {
        console.error('Error playing daily reward:', error);
        res.status(500).json({ message: 'Server error during reward processing.' });
    }
};

export const getDailyPlayStatus = async (req, res) => {
    const userId = req.user._id; 

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const userPlay = await RewardPlay.findOne({ user: userId });

        let canPlay = true;
        let lastResult = null;

        if (userPlay) {
            const lastPlayed = new Date(userPlay.lastPlayedDate);
            lastPlayed.setHours(0, 0, 0, 0);

            if (lastPlayed.getTime() === today.getTime()) {
                canPlay = false;
                lastResult = userPlay.lastPrize;
            }
        }

        res.json({ canPlay, lastResult });

    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};