const axios = require('axios');

module.exports = [
    // 1. COPILOT
    {
        name: 'copilot',
        category: 'ai',
        description: 'Microsoft Copilot',
        usage: '.copilot <query>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const query = args.join(" ").trim();

            if (!query) {
                return await sock.sendMessage(jid, { text: '⚠️ Please provide a query for Copilot!' }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "🧠", key: msg.key } });
                
                const thinking = await sock.sendMessage(jid, { text: `🤖 _Thinking..._` }, { quoted: msg });

                const res = await axios.get(`https://eliteprotech-apis.zone.id/copilot?prompt=${encodeURIComponent(query)}`, { timeout: 20000 });
                
                const reply = res.data?.result || res.data?.response || res.data?.text || "I couldn't get an answer.";

                try {
                    await sock.sendMessage(jid, { text: reply }, { edit: thinking.key });
                } catch {
                    await sock.sendMessage(jid, { text: reply }, { quoted: msg });
                }

                await sock.sendMessage(jid, { react: { text: "✨", key: msg.key } });

            } catch (err) {
                console.error("COPILOT ERROR:", err.message);
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // 2. CHATGPT (GPT)
    {
        name: 'gpt',
        alias: ['chatgpt'],
        category: 'ai',
        description: 'ChatGPT AI Assistant',
        usage: '.gpt <query>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const query = args.join(" ").trim();

            if (!query) {
                return await sock.sendMessage(jid, { text: '⚠️ Example:\n.gpt Hello' }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "🧠", key: msg.key } });

                const api = `https://api-aswin-sparky.koyeb.app/api/search/gpt3?search=${encodeURIComponent(query)}`;
                const { data } = await axios.get(api, { timeout: 20000 });

                const reply = data?.result || data?.response || data?.data || "No response.";

                // വാട്ടർമാർക്ക് ഒഴിവാക്കി ക്ലീൻ ആയ ഔട്ട്‌പുട്ട് മാത്രം (No Watermark)
                await sock.sendMessage(
                    jid,
                    { text: reply },
                    { quoted: msg }
                );

                await sock.sendMessage(jid, { react: { text: "✨", key: msg.key } });

            } catch (e) {
                console.error("GPT ERROR:", e.message);
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    }
];