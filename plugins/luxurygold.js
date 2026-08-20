const axios = require("axios");

module.exports = {
    name: "luxurygold",
    alias: ["gold"],
    category: "logo",
    description: "Luxury Gold Text Logo",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const text = args.join(" ").trim();

        if (!text) {
            return await sock.sendMessage(
                jid,
                { text: "❌ Please provide text.\n\nExample:\n.luxurygold KIRA" },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, {
                react: { text: "✨", key: msg.key }
            });

            let imageUrl = null;
            let retries = 3; // 🔥 3 പ്രാവശ്യം ട്രൈ ചെയ്യാൻ സെറ്റ് ചെയ്യുന്നു

            while (retries > 0) {
                try {
                    const { data } = await axios.get(
                        `https://jerrycoder.oggyapi.workers.dev/ephoto/luxurygold?text=${encodeURIComponent(text)}`,
                        { timeout: 15000 }
                    );

                    imageUrl = data.result || data.url || data.image;
                    if (imageUrl) break; // ഫോട്ടോ കിട്ടിയാൽ ലൂപ്പ് നിർത്തും
                } catch (err) {
                    console.log(`Retry left: ${retries - 1} - Error: ${err.message}`);
                }
                
                retries--;
                if (retries > 0) await new Promise(resolve => setTimeout(resolve, 2000)); // 2 സെക്കൻഡ് ഗ്യാപ്പിൽ വീണ്ടും ട്രൈ ചെയ്യും
            }

            if (!imageUrl) {
                throw new Error("Failed after 3 retries");
            }

            await sock.sendMessage(
                jid,
                {
                    image: { url: imageUrl },
                    caption: `✨ *LUXURY GOLD*\n\n📝 Text: ${text}`
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (e) {
            console.log("LUXURYGOLD ERROR:", e.message);

            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });

            await sock.sendMessage(
                jid,
                { text: "❌ Something went wrong, please try again later." },
                { quoted: msg }
            );
        }
    }
};