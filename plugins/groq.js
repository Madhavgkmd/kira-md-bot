// plugins/groq.js - KIRA X MD 
const axios = require('axios');

// 🔥 GitHub Block ചെയ്യാതിരിക്കാൻ കീകൾ നേരിട്ട് കൊടുക്കുന്നില്ല! 
// പകരം നിന്റെ .env ഫയലിൽ നിന്ന് എടുക്കുന്നു.
const envKeys = process.env.GROQ_API_KEYS || "";
const GROQ_API_KEYS = envKeys ? envKeys.split(',') : [
    "PUT_YOUR_KEY_1_HERE",
    "PUT_YOUR_KEY_2_HERE",
    "PUT_YOUR_KEY_3_HERE",
    "PUT_YOUR_KEY_4_HERE",
    "PUT_YOUR_KEY_5_HERE"
];

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

module.exports = {
    name: 'groq',
    alias: ['groqai', 'chat'],
    category: 'ai',
    description: 'Ask anything to Groq AI',
    usage: '.groq <question>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
        
        let prompt = (args && Array.isArray(args)) ? args.join(' ') : '';
        if (!prompt && quotedText) prompt = quotedText;

        if (!prompt) return await sock.sendMessage(jid, { text: "⚠️ *Type a question!*\n_Example: .groq Who is Goku?_" }, { quoted: msg });

        await sock.sendMessage(jid, { react: { text: "⚡", key: msg.key } });

        // 🛑 LANGUAGE RULE FOR GROQ (English or Manglish)
        const systemPrompt = `You are ${global.config?.BOT_NAME || 'KIRA AI'}, a smart WhatsApp assistant created by Madhav. You love anime. STRICT LANGUAGE RULE: You must reply in the EXACT SAME LANGUAGE the user uses. If the user types in English, reply ONLY in English. If the user types in Malayalam, reply in Manglish (Malayalam written in English letters) because your Malayalam script is bad. Do not use weird Malayalam script. Be friendly and casual.`;
        let aiReply = null;

        for (const apiKey of GROQ_API_KEYS) {
            if (aiReply) break;
            
            // കീ സെറ്റ് ആക്കിയിട്ടില്ലെങ്കിൽ എറർ കാണിക്കാൻ
            if (apiKey.startsWith("PUT_YOUR_KEY")) {
                console.log("[Groq AI] Missing API Key! Please add it in .env file.");
                continue;
            }

            for (const model of GROQ_MODELS) {
                try {
                    const response = await axios.post(
                        'https://api.groq.com/openai/v1/chat/completions',
                        {
                            model: model, 
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: prompt }
                            ]
                        },
                        { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
                    );
                    if (response.data && response.data.choices) {
                        aiReply = response.data.choices[0].message.content;
                        break; 
                    }
                } catch (err) {
                    console.log(`[Groq AI] Model ${model} failed. Trying next...`);
                }
            }
        }

        if (aiReply) {
            await sock.sendMessage(jid, { text: aiReply }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } else {
            await sock.sendMessage(jid, { text: "❌ *Brain timeout! All Groq keys and models failed or missing keys.*" }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};