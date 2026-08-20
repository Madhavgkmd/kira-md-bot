const axios = require("axios");

module.exports = {
    name: "cartoon",
    alias: ["cartoonstyle"],
    category: "logo",
    description: "Generate Cartoon Style Logo",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const text = args.join(" ").trim();

        // ❌ വാട്ടർമാർക്കും എറർ ഉണ്ടാക്കുന്ന botName കോഡും പൂർണ്ണമായി ഒഴിവാക്കി

        if (!text) {
            return await sock.sendMessage(
                jid,
                {
                    text: `❌ Give some text.\n\nExample:\n.cartoon Kira`
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
                `https://jerrycoder.oggyapi.workers.dev/ephoto/cartoonstyle?text=${encodeURIComponent(text)}`
            );

            console.log("CARTOON API:", data);

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
                    caption: `🎨 *CARTOON STYLE*\n\n📝 Text: ${text}`
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (err) {
            console.log(
                "CARTOON ERROR:",
                err
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });

            await sock.sendMessage(
                jid,
                {
                    text: "❌ Failed to generate logo."
                },
                { quoted: msg }
            );
        }
    }
};