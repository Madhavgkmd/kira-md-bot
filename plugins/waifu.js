const axios = require("axios");

module.exports = {
    name: "waifu",
    alias: ["animegirl"],
    category: "anime",
    desc: "Random Waifu Image",

    async execute(sock, msg) {
        try {
            const jid = msg.key.remoteJid;

            const api =
                "https://jerrycoder.oggyapi.workers.dev/anime/waifu?json=false";

            await sock.sendMessage(
                jid,
                {
                    image: { url: api },
                    caption: "💖 Random Waifu"
                },
                { quoted: msg }
            );

        } catch (err) {
            console.log(err);

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: "❌ Failed to fetch waifu."
                },
                { quoted: msg }
            );
        }
    }
};