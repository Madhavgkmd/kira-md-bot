// plugins/groq.js - KIRA X MD (No API Key Required, Fast & Clean)
const axios = require('axios');
const { getSettings } = require('../lib/database'); // 🔥 എറർ ഇല്ലാതെ പേരെടുക്കാൻ

module.exports = {
    name: 'groq',
    alias: ['groqai', 'chat'],
    category: 'ai',
    description: 'Ask anything to AI',
    usage: '.groq <question>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
        
        let query = (args && Array.isArray(args)) ? args.join(' ') : '';
        if (!query && quotedText) query = quotedText;

        if (!query) {
            return await sock.sendMessage(jid, { text: "⚠️ *Type a question!*\n_Example: .groq Who is Goku?_" }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⚡", key: msg.key } });
            
            const thinking = await sock.sendMessage(jid, { text: `🤖 _Thinking..._` }, { quoted: msg });

            // 🔥 ഓരോ ബോട്ടിന്റെയും പേര് കറക്റ്റ് ആയി എടുക്കുന്നു (Pair bot support)
            const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, "");
            const config = getSettings(botNumber);
            const botName = config?.botName || process.env.BOT_NAME || 'KIRA X MD';
            const ownerName = config?.ownerName || process.env.OWNER_NAME || 'the owner';

            // 🛑 LANGUAGE RULE FOR GROQ (English or Manglish) - നീ കൊടുത്ത അതേ റൂൾ!
            const promptText = `You are ${botName}, a smart WhatsApp assistant created by ${ownerName}. You love anime. STRICT LANGUAGE RULE: You must reply in the EXACT SAME LANGUAGE the user uses. If the user types in English, reply ONLY in English. If the user types in Malayalam, reply in Manglish (Malayalam written in English letters) because your Malayalam script is bad. Do not use weird Malayalam script. Be friendly and casual.\n\nUser: ${query}`;

            // 🔥 നീ തന്ന രണ്ട് പബ്ലിക് API-കളും ഇവിടെ കൊടുത്തിട്ടുണ്ട്
            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/ai/gemini?prompt=${encodeURIComponent(promptText)}`,
                `https://eliteprotech-apis.zone.id/chatgpt?prompt=${encodeURIComponent(promptText)}`
            ];

            let aiReply = null;

            for (const apiUrl of apis) {
                try {
                    const res = await axios.get(apiUrl, { timeout: 15000 });
                    const data = res.data;

                    if (typeof data === "string") {
                        aiReply = data;
                    } else {
                        aiReply = data?.reply || data?.response || data?.result || data?.text || data?.message || "";
                    }

                    if (aiReply) break; 
                } catch (e) {
                    console.log("Groq fallback API failed, trying next...");
                }
            }

            if (!aiReply) {
                throw new Error("All AI APIs failed.");
            }

            aiReply = String(aiReply).replace(/ChatGPT|Gemini|Google AI|OpenAI/gi, "AI assistant").trim();

            // പഴയ Thinking മെസ്സേജ് മാറ്റി ഒറിജിനൽ മറുപടി വെക്കുന്നു (No Watermark)
            try {
                await sock.sendMessage(jid, { text: aiReply }, { edit: thinking.key });
            } catch {
                await sock.sendMessage(jid, { text: aiReply }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "✨", key: msg.key } });

        } catch (err) {
            console.error("GROQ ERROR:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: "❌ Something went wrong, please try again later." }, { quoted: msg });
        }
    }
};