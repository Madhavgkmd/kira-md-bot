// plugins/insta.js - KIRA X MD (Multi-Bot Supported Version)

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
                throw new Error("No data found");
            }

            const items = data.data;
            console.log(`✅ API Success! Found ${items.length} media item(s).`);

            // ─────────────────────────────────────
            // 3. BUFFER FIX & SEND TO WHATSAPP
            // ─────────────────────────────────────
            for (const item of items) {
                const mediaUrl = item.url;
                if (!mediaUrl) continue;

                const type = item.type === "video" ? "video" : "image";
                console.log(`📡 Downloading ${type} as buffer to support multiple bots...`);

                // 🔥 THE FIX: Download as buffer first
                const mediaResponse = await axios.get(mediaUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 60000 // 1 minute timeout for large videos
                });
                const mediaBuffer = Buffer.from(mediaResponse.data);

                if (type === "video") {
                    await sock.sendMessage(jid, { 
                        video: mediaBuffer, 
                        caption: "" 
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(jid, { 
                        image: mediaBuffer, 
                        caption: "" 
                    }, { quoted: msg });
                }
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("❌ INSTA ERROR:", err.message);
            
            // 🔥 CUSTOM ERROR MESSAGE
            await sock.sendMessage(jid, { 
                text: "❌ *Something error please try again later*" 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};