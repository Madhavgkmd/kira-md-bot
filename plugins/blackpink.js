const axios = require("axios");

module.exports = {
    name: "blackpink",
    alias: ["blackpinklogo", "bplogo"],
    category: "logo",
    description: "Generate Blackpink Style Logo",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const text = args.join(" ").trim();

        // ❌ വാട്ടർമാർക്ക് / ബോട്ട് നെയിം പൂർണ്ണമായി ഒഴിവാക്കി (ക്ലീൻ ക്യാപ്ഷൻ)

        if (!text) {
            return await sock.sendMessage(
                jid,
                {
                    text: `❌ Give some text.\n\nExample:\n.blackpink Kira`
                },
                { quoted: msg }
            );
        }

        try {
            // ലോഡിങ് റിയാക്ഷൻ (ബ്ലാക്ക് പിങ്ക് ആയതുകൊണ്ട് 🎀 കൊടുക്കാം)
            await sock.sendMessage(jid, {
                react: {
                    text: "🎀",
                    key: msg.key
                }
            });

            // API കാൾ ചെയ്യുന്നു
            const { data } = await axios.get(
                `https://jerrycoder.oggyapi.workers.dev/ephoto/blackpinklogo?text=${encodeURIComponent(text)}`
            );

            console.log("BLACKPINK API:", data);

            // റിസൾട്ടിൽ നിന്ന് ഇമേജ് URL എടുക്കുന്നു
            const imageUrl =
                data.result ||
                data.url ||
                data.image;

            if (!imageUrl) {
                throw new Error(
                    "No image URL returned"
                );
            }

            // ഫോട്ടോ അയക്കുന്നു (ക്ലീൻ ക്യാപ്ഷൻ)
            await sock.sendMessage(
                jid,
                {
                    image: {
                        url: imageUrl
                    },
                    caption: `🎀 *BLACKPINK LOGO*\n\n📝 Text: ${text}`
                },
                { quoted: msg }
            );

            // സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (err) {
            console.log(
                "BLACKPINK ERROR:",
                err
            );

            // എറർ റിയാക്ഷൻ
            await sock.sendMessage(jid, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });

            // എറർ മെസ്സേജ്
            await sock.sendMessage(
                jid,
                {
                    text: "❌ Failed to generate Blackpink logo."
                },
                { quoted: msg }
            );
        }
    }
};