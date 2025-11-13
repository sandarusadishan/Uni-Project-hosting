import mongoose from 'mongoose'; // ✅ 'require' වෙනුවට 'import' භාවිතා කර ඇත.

const couponSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true,
        unique: true // කූපන් කේතය අද්විතීය විය යුතුය
    },
    prizeName: { // e.g., 'LKR 100 OFF', 'FREE DRINK'
        type: String, 
        required: true 
    },
    discountType: { // 'flat', 'percentage', 'free_item'
        type: String,
        required: true 
    },
    value: { // 100 or 0.10 (for 10%)
        type: Number,
        required: true
    },
    isUsed: { 
        type: Boolean, 
        default: false 
    },
    assignedTo: { // කූපනය හිමි User
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    expiryDate: {
        type: Date,
        default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // දින 7කින් කල් ඉකුත් වේ
    }
}, { timestamps: true });

// 🎯 Model එක export default ලෙස සකස් කර ඇත.
const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;