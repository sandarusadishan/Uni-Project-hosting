import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

import Product from "../models/Product.js"; // Import the Product model
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// AI Model Configuration
const model = genAI.getGenerativeModel({
  model: "gemini-pro",
  // Safety settings to prevent the model from blocking reasonable prompts
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ],
});

// ✅ AI Personality and Instructions
const personaPrompt = `
You are 'BiteBot', the friendly and energetic AI assistant for BurgerShop. Your goal is to help customers with a fun and positive attitude.

Your instructions:
1.  Always be cheerful and use burger-related puns where appropriate (but don't overdo it!).
2.  Your knowledge is strictly limited to BurgerShop. This includes our menu, ingredients, special offers, and order process.
3.  If a user asks about anything not related to BurgerShop (like the weather, politics, or other restaurants), politely steer the conversation back to burgers. For example: "I'm a burger expert, not a meteorologist! But I can tell you it's always a sunny day for a burger at BurgerShop. What can I get for you?"
4.  Keep your answers concise and helpful.
5.  Do not use markdown formatting in your replies.
`;

export const handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    // 💡 FIX: The last message in the history is the user's current message.
    // We should not include it in the history array for the AI model,
    // as it's passed separately via `sendMessageStream`.
    const conversationHistory = (history || []).slice(0, -1);

    // Map frontend history to the format Gemini expects ('user' -> 'user', 'admin' -> 'model')
    const chatHistory = conversationHistory.map(msg => ({
      role: msg.from === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Start a chat session with the persona and existing history
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: personaPrompt }] },
        { role: "model", parts: [{ text: "Got it! I'm BiteBot, ready to help with all things BurgerShop! What's sizzling?" }] },
        ...chatHistory
      ],
      generationConfig: {
        maxOutputTokens: 200,
      },
    });

    // ✅ Change to sendMessageStream to get the response as a stream
    const result = await chat.sendMessageStream(message);

    // Set headers for a streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Stream each chunk to the client as it arrives
    for await (const chunk of result.stream) {
      res.write(chunk.text());
    }

    res.end(); // End the stream
  } catch (error) {
    console.error("Gemini AI Error in backend:", error);
    res.status(500).json({ message: "Error processing chat with AI" });
  }
};