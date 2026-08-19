const axios = require("axios");

module.exports = {
    name: "gpt",
    alias: ["chatgpt"],
    category: "ai",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query =
            args.join(" ").trim();

        if (!query)
            return sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Example:\n.gpt Hello"
                },
                { quoted: msg }
            );

        try {
            await sock.sendMessage(jid, {
                react: {
                    text: "🧠",
                    key: msg.key
                }
            });

            const api =
                `https://api-aswin-sparky.koyeb.app/api/search/gpt3?search=${encodeURIComponent(query)}`;

            const { data } =
                await axios.get(api);

            const reply =
                data?.result ||
                data?.response ||
                data?.data ||
                "No response.";

            await sock.sendMessage(
                jid,
                {
                    text:
`🩸 *AI*

${reply}

> *Powered by ${global.config?.BOT_NAME || 'KIRA X MD'}*`
                },
                { quoted: msg }
            );

        } catch (e) {
            await sock.sendMessage(
                jid,
                {
                    text:
                        "❌ AI Error"
                },
                { quoted: msg }
            );
        }
    }
};