// plugins/insta.js - KIRA X MD (Aswin Sparky API Version)

const axios = require("axios");

module.exports = {
    name: "insta",
    alias: ["ig", "instagram", "reel"],
    category: "downloader",
    description: "Instagram Downloader using Aswin Sparky API",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args || []).join(" ").trim();

        // ─────────────────────────────────────
        // 1. GET URL FROM ARGS OR QUOTED MSG
        // ─────────────────────────────────────
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!url && quoted) {
            const text = 
                quoted.conversation || 
                quoted.extendedTextMessage?.text || 
                quoted.imageMessage?.caption || 
                quoted.videoMessage?.caption || 
                "";
            const match = text.match(/https?:\/\/[^\s]+/i);
            if (match) url = match[0];
        }

        if (!url || !url.startsWith("http")) {
            return sock.sendMessage(jid, { 
                text: "❌ *Example:* .insta <Instagram link>" 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            console.log("\n========== INSTA DOWNLOADER ==========");
            console.log("Target URL:", url);

            // ─────────────────────────────────────
            // 2. FETCH FROM ASWIN SPARKY API
            // ─────────────────────────────────────
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(url)}`;
            
            const res = await axios.get(apiUrl, { timeout: 30000 });
            const data = res.data;

            if (!data || !data.status || !data.data || data.data.length === 0) {
                throw new Error("Could not extract media. The post might be private or deleted.");
            }

            const items = data.data;
            console.log(`✅ API Success! Found ${items.length} media item(s).`);

            // ─────────────────────────────────────
            // 3. SEND DIRECTLY TO WHATSAPP
            // ─────────────────────────────────────
            for (const item of items) {
                const mediaUrl = item.url;
                if (!mediaUrl) continue;

                // Checking type directly from the Sparky API payload
                const type = item.type === "video" ? "video" : "image";
                console.log(`📡 Sending ${type} to WhatsApp...`);

                // Because dl.snapcdn.app handles the CDN headers perfectly, 
                // we can safely pass the URL directly to Baileys!
                if (type === "video") {
                    await sock.sendMessage(jid, { 
                        video: { url: mediaUrl }, 
                        caption: "" // Keeping it clean as you requested earlier
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(jid, { 
                        image: { url: mediaUrl }, 
                        caption: "" 
                    }, { quoted: msg });
                }
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("❌ INSTA ERROR:", err.message);
            
            await sock.sendMessage(jid, { 
                text: `❌ *Download Failed*\n\n⚠️ ${err.message}` 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};