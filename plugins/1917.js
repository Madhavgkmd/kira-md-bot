const axios = require("axios");

module.exports = {
    name: "1917",
    alias: ["1917style"],
    category: "logo",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;
        const text = args.join(" ");

        if (!text) {
            return sock.sendMessage(
                jid,
                {
                    text: "Example:\n.1917 KIRA-X"
                },
                { quoted: msg }
            );
        }

        try {

            await sock.sendMessage(jid, {
                react: {
                    text: "🎨",
                    key: msg.key
                }
            });

            const { data } = await axios.get(
                `https://jerrycoder.oggyapi.workers.dev/ephoto/1917style?text=${encodeURIComponent(text)}`
            );

            console.log(data);

            const imageUrl =
                data.result ||
                data.url ||
                data.image;

            if (!imageUrl) {
                throw new Error(
                    "No image URL returned"
                );
            }

            await sock.sendMessage(
                jid,
                {
                    image: {
                        url: imageUrl
                    },
                    caption:
`✨ 1917 Style\n📝 ${text}`
                },
                { quoted: msg }
            );

        } catch (err) {

            console.log(
                "1917 ERROR:",
                err
            );

            await sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Failed to generate logo."
                },
                { quoted: msg }
            );
        }
    }
};