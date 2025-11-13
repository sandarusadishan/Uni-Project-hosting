// models/Order.js

import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // Individual item price
    image: { type: String },
});

const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, // User ID එක Link කරන්න
        ref: 'User',
        required: true,
    },
    items: [OrderItemSchema], // ඇණවුම් කරන ලද items array එක
    totalAmount: {
        type: Number,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'preparing', 'on-the-way', 'delivered'], // ඇණවුම් තත්ත්වයන්
        default: 'pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Order = mongoose.model('Order', OrderSchema);
export default Order;