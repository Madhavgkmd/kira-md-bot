const axios = require("axios");

module.exports = {
    name: "pixelglitch",
    alias: ["pglitch"],
    category: "logo",
    description: "Generate Pixel Glitch Logo",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const text = args.join(" ").trim();

        if (!text) {
            return await sock.sendMessage(
                jid,
                { text: "❌ Please provide text.\n\nExample:\n.pixelglitch KIRA" },
                { quoted: msg }
            );
        }

        try {
            // ലോഡിങ് റിയാക്ഷൻ
            await sock.sendMessage(jid, {
                react: { text: "🎨", key: msg.key }
            });

            let imageUrl = null;
            let retries = 3; // 🔥 3 പ്രാവശ്യം ട്രൈ ചെയ്യാൻ

            while (retries > 0) {
                try {
                    // API കാൾ ചെയ്ത് JSON ഡാറ്റ വാങ്ങുന്നു
                    const { data } = await axios.get(
                        `https://jerrycoder.oggyapi.workers.dev/ephoto/pixelglitch?text=${encodeURIComponent(text)}`,
                        { timeout: 15000 }
                    );

                    imageUrl = data.result || data.url || data.image;
                    if (imageUrl) break; // ഫോട്ടോ കിട്ടിയാൽ ലൂപ്പ് നിർത്തും
                } catch (err) {
                    console.log(`PixelGlitch Retry left: ${retries - 1} - Error: ${err.message}`);
                }
                
                retries--;
                if (retries > 0) await new Promise(resolve => setTimeout(resolve, 2000)); // 2 സെക്കൻഡ് ഗ്യാപ്പ്
            }

            if (!imageUrl) {
                throw new Error("Failed after 3 retries");
            }

            // ഫോട്ടോ അയക്കുന്നു (ക്ലീൻ ക്യാപ്ഷൻ)
            await sock.sendMessage(
                jid,
                {
                    image: { url: imageUrl },
                    caption: `✨ *PIXEL GLITCH*\n\n📝 Text: ${text}`
                },
                { quoted: msg }
            );

            // സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (e) {
            console.log("PIXELGLITCH ERROR:", e.message);

            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });

            // സിമ്പിൾ എറർ മെസ്സേജ്
            await sock.sendMessage(
                jid,
                { text: "❌ Something went wrong, please try again later." },
                { quoted: msg }
            );
        }
    }
};