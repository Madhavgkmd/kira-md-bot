const axios = require("axios");

module.exports = {
    name: "ai",
    alias: ["kira", "bot", "chat"],
    category: "ai",
    description: "KIRA AI Assistant (Custom Persona)",
    usage: `${process.env.PREFIX || '.'}ai <question>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const question = args.join(" ").trim();

        if (!question) {
            return await sock.sendMessage(jid, { text: "🩸 *KIRA AI*\n\n➤ Example: .ai Tell me about India" }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "🧠", key: msg.key } });
            const thinking = await sock.sendMessage(jid, { text: "🩸 *_KIRA is thinking..._*" }, { quoted: msg });

            const prompt = `You are KIRA, an anime-style AI. Creator: Madhav. User: ${question}. Reply in detail.`;

            // Epsilon മാറ്റി, സംസാരശേഷിയുള്ള API-കൾ മാത്രം വെച്ചു
            const apis = [
                `https://eliteprotech-apis.zone.id/chatgpt?prompt=${encodeURIComponent(question)}`,
                `https://jerrycoder.oggyapi.workers.dev/ai/gemini?prompt=${encodeURIComponent(prompt)}`,
                `https://jerrycoder.oggyapi.workers.dev/ai/gpt?q=${encodeURIComponent(prompt)}`
            ];

            let reply = "";

            for (const url of apis) {
                try {
                    const res = await axios.get(url, { timeout: 20000 });
                    const data = res.data;
                    
                    if (data.reply) { reply = data.reply; break; }
                    if (data.response) { reply = data.response; break; }
                    if (data.result) { reply = data.result; break; }
                    if (data.text) { reply = data.text; break; }
                    if (data.message) { reply = data.message; break; }
                } catch (e) {
                    console.log("API FAILED, TRYING NEXT:", url);
                    continue; 
                }
            }

            if (!reply) throw new Error("No response from any API");

            // മറ്റ് AI പേരുകൾ മാറ്റി KIRA എന്നാക്കുന്നു
            reply = reply.replace(/ChatGPT|Gemini|Google AI|OpenAI/gi, "KIRA");

            const message = `╭━━━〔 K I R A • A I 〕━━━⬣\n\n👤 ${question}\n\n┈┈┈┈┈┈┈┈┈┈\n\n${reply}\n\n┈┈┈┈┈┈┈┈┈┈\n🩸 Justice Never Sleeps.\n╰━━━━━━━━━━━━━━⬣`;

            await sock.sendMessage(jid, { text: message, edit: thinking.key }).catch(async () => {
                await sock.sendMessage(jid, { text: message }, { quoted: msg });
            });

            await sock.sendMessage(jid, { react: { text: "✨", key: msg.key } });

        } catch (err) {
            console.error("KIRA AI ERROR:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: "🩸 *KIRA AI*\n\nI couldn't answer, Senpai. Try again later." }, { quoted: msg });
        }
    }
};