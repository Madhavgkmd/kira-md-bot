module.exports = {
    name: "deletingtext",
    alias: ["dtext"],
    category: "logo",
    description: "Generate Deleting Text Logo",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const text = args.join(" ").trim();
        
        // ❌ എറർ ഉണ്ടാക്കുന്ന വാട്ടർമാർക്കും botName-ഉം ഒഴിവാക്കി

        if (!text) {
            return sock.sendMessage(
                jid,
                {
                    text: `❌ Example:\n.deletingtext Kira`
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

            const image =
                `https://jerrycoder.oggyapi.workers.dev/ephoto/deletingtext?text=${encodeURIComponent(text)}`;

            await sock.sendMessage(
                jid,
                {
                    image: {
                        url: image
                    },
                    caption: `✨ *DELETING TEXT LOGO*\n\n📝 Text: ${text}`
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (e) {
            console.log("DELETINGTEXT ERROR:", e);

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