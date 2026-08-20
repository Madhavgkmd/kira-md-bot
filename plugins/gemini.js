// plugins/gemini.js - KIRA X MD (No API Key Required, Fast & Clean)
const axios = require('axios');
const { getSettings } = require('../lib/database'); // 🔥 എറർ ഇല്ലാതെ പേരെടുക്കാൻ ഡാറ്റാബേസ് കണക്ട് ചെയ്തു

module.exports = {
    name: 'gemini',
    alias: ['ai', 'ask'],
    category: 'ai',
    description: 'Ask anything to AI',
    usage: '.ai <question>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
        
        let query = (args && Array.isArray(args)) ? args.join(' ') : '';
        if (!query && quotedText) query = quotedText;

        if (!query) {
            return await sock.sendMessage(jid, { text: "⚠️ *ചോദ്യം ടൈപ്പ് ചെയ്യുക!*\n_Example: .ai Who is Goku?_" }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "🧠", key: msg.key } });
            
            const thinking = await sock.sendMessage(jid, { text: `🤖 _Thinking..._` }, { quoted: msg });

            // 🔥 ഓരോ ബോട്ടിന്റെയും പേര് കറക്റ്റ് ആയി എടുക്കുന്നു (Pair bot support)
            const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, "");
            const config = getSettings(botNumber);
            const botName = config?.botName || process.env.BOT_NAME || 'KIRA X MD';
            const ownerName = config?.ownerName || process.env.OWNER_NAME || 'the owner';

            // സിസ്റ്റം പ്രോംപ്റ്റും യൂസറുടെ ചോദ്യവും ഒരുമിപ്പിക്കുന്നു
            const promptText = `You are ${botName}, a smart WhatsApp assistant created by ${ownerName}. You love anime. STRICT LANGUAGE RULE: You must reply in the EXACT SAME LANGUAGE the user uses. If the user types in English (e.g., 'Hi', 'How are you'), reply ONLY in English. If the user types in Malayalam, reply in pure Malayalam script. Never force Malayalam unless the user initiates it. Be friendly and casual.\n\nUser: ${query}`;

            // 🔥 നീ തന്ന രണ്ട് പബ്ലിക് API-കളും ഇവിടെ കൊടുത്തിട്ടുണ്ട്
            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/ai/gemini?prompt=${encodeURIComponent(promptText)}`,
                `https://eliteprotech-apis.zone.id/chatgpt?prompt=${encodeURIComponent(promptText)}`
            ];

            let aiReply = null;

            // ആദ്യത്തെ API വർക്ക് ആയില്ലെങ്കിൽ രണ്ടാമത്തേത് ഓട്ടോമാറ്റിക് ആയി എടുക്കും!
            for (const apiUrl of apis) {
                try {
                    const res = await axios.get(apiUrl, { timeout: 15000 });
                    const data = res.data;

                    if (typeof data === "string") {
                        aiReply = data;
                    } else {
                        aiReply = data?.reply || data?.response || data?.result || data?.text || data?.message || "";
                    }

                    if (aiReply) break; // റിപ്ലൈ കിട്ടിയാൽ നിർത്തും
                } catch (e) {
                    console.log("AI API failed, trying next...");
                }
            }

            if (!aiReply) {
                throw new Error("All AI APIs failed.");
            }

            // അനാവശ്യ പേരുകൾ വല്ലതും വന്നാൽ മാറ്റി ക്ലീൻ ആക്കുന്നു
            aiReply = String(aiReply).replace(/ChatGPT|Gemini|Google AI|OpenAI/gi, "AI assistant").trim();

            // പഴയ Thinking മെസ്സേജ് മാറ്റി ഒറിജിനൽ മറുപടി വെക്കുന്നു (No Watermark)
            try {
                await sock.sendMessage(jid, { text: aiReply }, { edit: thinking.key });
            } catch {
                await sock.sendMessage(jid, { text: aiReply }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "✨", key: msg.key } });

        } catch (err) {
            console.error("GEMINI/AI ERROR:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            
            // വളരെ സിമ്പിൾ ആയ എറർ മെസ്സേജ്
            await sock.sendMessage(jid, { text: "❌ Something went wrong, please try again later." }, { quoted: msg });
        }
    }
};