const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

let chat;

async function generateGeminiResponse(prompt, onChunk) {
    try {
        if (!chat) {
            chat = await model.startChat();
        }
        
        const stream = await chat.sendMessageStream(prompt);

        for await (const chunk of stream.stream) {
            const part = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (part && onChunk) {
                onChunk(part);
            }
        }
    } catch (error) {
        console.error('Error al comunicarse con Gemini:', error);
        return null;
    }
}

module.exports = { model, generateGeminiResponse };