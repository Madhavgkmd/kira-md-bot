// plugins/gemini.js - KIRA X MD
const axios = require('axios');

// 🔥 GitHub Block ഒഴിവാക്കാൻ കീകൾ .env ഫയലിൽ നിന്നും എടുക്കുന്നു.
const envKeys = process.env.GEMINI_API_KEYS || "";
const GEMINI_API_KEYS = envKeys ? envKeys.split(',') : [
    "PUT_YOUR_GEMINI_KEY_1_HERE",
    "PUT_YOUR_GEMINI_KEY_2_HERE",
    "PUT_YOUR_GEMINI_KEY_3_HERE",
    "PUT_YOUR_GEMINI_KEY_4_HERE",
    "PUT_YOUR_GEMINI_KEY_5_HERE"
];

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-pro'];

module.exports = {
    name: 'gemini',
    alias: ['ai', 'ask'],
    category: 'ai',
    description: 'Ask anything to Gemini AI',
    usage: '.ai <question>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
        
        let prompt = (args && Array.isArray(args)) ? args.join(' ') : '';
        if (!prompt && quotedText) prompt = quotedText;

        if (!prompt) return await sock.sendMessage(jid, { text: "⚠️ *ചോദ്യം ടൈപ്പ് ചെയ്യുക!*\n_Example: .ai Who is Goku?_" }, { quoted: msg });

        await sock.sendMessage(jid, { react: { text: "🧠", key: msg.key } });

        const systemPrompt = "You are KIRA AI, a smart WhatsApp assistant created by Madhav. You love anime. STRICT LANGUAGE RULE: You must reply in the EXACT SAME LANGUAGE the user uses. If the user types in English (e.g., 'Hi', 'How are you'), reply ONLY in English. If the user types in Malayalam, reply in pure Malayalam script. Never force Malayalam unless the user initiates it. Be friendly and casual.";
        let aiReply = null;

        for (const apiKey of GEMINI_API_KEYS) {
            if (aiReply) break;
            
            // ഡമ്മി കീ ആണെങ്കിൽ എറർ കാണിക്കാൻ
            if (apiKey.startsWith("PUT_YOUR_GEMINI")) {
                console.log("[Gemini AI] Missing API Key! Please add it in .env file.");
                continue;
            }

            for (const model of GEMINI_MODELS) {
                try {
                    const response = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                        {
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            contents: [{ role: "user", parts: [{ text: prompt }] }]
                        },
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                    if (response.data && response.data.candidates) {
                        aiReply = response.data.candidates[0].content.parts[0].text;
                        break; 
                    }
                } catch (err) {
                    console.log(`[Gemini AI] Model ${model} failed. Trying next...`);
                }
            }
        }

        if (aiReply) {
            await sock.sendMessage(jid, { text: aiReply }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } else {
            await sock.sendMessage(jid, { text: "❌ *Brain timeout! All Gemini keys and models failed or missing keys.*" }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};