const axios = require("axios");
const { getSettings } = require("../lib/database");

module.exports = {
    name: "ai",
    alias: ["kira", "bot", "chat"],
    category: "ai",
    description: "AI Assistant",
    usage: ".ai <question>",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const question = args.join(" ").trim();

        if (!question) {
            return await sock.sendMessage(
                jid,
                { text: `🤖 *AI Assistant*\n\nAsk me anything!` },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, { react: { text: "🧠", key: msg.key } });

            const thinking = await sock.sendMessage(
                jid,
                { text: `🤖 _Thinking..._` },
                { quoted: msg }
            );

            // 🔥 എറർ ഇല്ലാതെ ബോട്ടിന്റെ പേരെടുക്കുന്നു (AI-ക്ക് സ്വന്തം പേര് മനസ്സിലാക്കാൻ)
            const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, "");
            const config = getSettings(botNumber);
            const botName = config?.botName || process.env.BOT_NAME || "KIRA X MD";

            // AI-ക്ക് കൊടുക്കുന്ന പ്രോംപ്റ്റ്
            const prompt = `
You are a smart, friendly and natural AI assistant for ${botName}.

Your identity:
- You are an AI assistant created for ${botName}.
- Do not claim to be ChatGPT, Gemini, Google AI or OpenAI.
- If asked "who are you?", introduce yourself naturally as an AI assistant for ${botName}.
- You do NOT need to mention the bot name in every reply.
- Speak naturally like a helpful human assistant.
- Keep answers appropriate to the user's question.
- Do not add unnecessary headings, question/answer labels, boxes or decorative formatting.
- Do not repeat the user's question.
- Answer directly.

User: ${question}
`;

            const apis = [
                `https://eliteprotech-apis.zone.id/chatgpt?prompt=${encodeURIComponent(prompt)}`,
                `https://jerrycoder.oggyapi.workers.dev/ai/gemini?prompt=${encodeURIComponent(prompt)}`,
                `https://jerrycoder.oggyapi.workers.dev/ai/gpt?q=${encodeURIComponent(prompt)}`
            ];

            let reply = "";

            // 3 API-കൾ ഉള്ളതുകൊണ്ട് ഒന്ന് ഫെയിൽ ആയാലും അടുത്തത് ട്രൈ ചെയ്യും!
            for (const url of apis) {
                try {
                    const res = await axios.get(url, { timeout: 20000 });
                    const data = res.data;

                    if (typeof data === "string") {
                        reply = data;
                    } else {
                        reply = data?.reply || data?.response || data?.result || data?.text || data?.message || "";
                    }

                    if (reply) break;
                } catch (e) {
                    console.log("AI API failed, trying next...");
                }
            }

            if (!reply) {
                throw new Error("No response from AI APIs");
            }

            // AI വേറെ കമ്പനിയുടെ പേര് പറഞ്ഞാൽ അത് മാറ്റി വെക്കുന്നു
            reply = String(reply)
                .replace(/ChatGPT|Gemini|Google AI|OpenAI/gi, "AI assistant")
                .trim();

            // "Thinking..." എന്ന മെസ്സേജ് മാറ്റി ഒറിജിനൽ റിപ്ലൈ ആക്കുന്നു (No Watermark)
            try {
                await sock.sendMessage(jid, { text: reply }, { edit: thinking.key });
            } catch {
                await sock.sendMessage(jid, { text: reply }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "✨", key: msg.key } });

        } catch (err) {
            console.error("AI ERROR:", err.message);

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });

            // സിമ്പിൾ എറർ മെസ്സേജ്
            await sock.sendMessage(
                jid,
                { text: "❌ Something went wrong, please try again later." },
                { quoted: msg }
            );
        }
    }
};