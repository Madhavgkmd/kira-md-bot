const fs = require('fs');
const path = require('path');
const webp = require('node-webpmux');

// ==========================================
// 💧 HELPER: Inject EXIF Metadata (Watermark)
// ==========================================
async function addMetadata(webpFilePath, packName, authorName) {
    try {
        const img = new webp.Image();
        await img.load(webpFilePath);

        const exifJSON = {
            "sticker-pack-id": "kira-x-md-sticker",
            "sticker-pack-name": packName || "User",
            "sticker-author-name": authorName || "KIRA X MD",
            "emojis": ["🌈", "✨"]
        };

        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(exifJSON), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);

        img.exif = exif;
        await img.save(webpFilePath);
    } catch (error) {
        console.error("Failed to add EXIF metadata:", error);
    }
}

// ==========================================
// 🧠 HELPER: Ultra-Stable ATTP Fetcher
// ==========================================
async function getAttpBuffer(text) {
    const encodedText = encodeURIComponent(text);
    
    // 1. List of newly updated Animated Text APIs
    const apis = [
        `https://api.vreden.web.id/api/maker/attp?text=${encodedText}`,
        `https://api.botcahx.eu.org/api/maker/attp?text=${encodedText}`,
        `https://api.erdwpe.com/api/maker/attp?text=${encodedText}`,
        `https://api.helv.io/attp?text=${encodedText}&format=webp`
    ];

    const fetchOptions = {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    };

    // Try to get Animated Sticker first
    for (const url of apis) {
        try {
            const response = await fetch(url, fetchOptions);
            if (response.ok) {
                const contentType = response.headers.get("content-type");
                // Avoid HTML error pages (Cloudflare blocks)
                if (contentType && !contentType.includes("text/html")) {
                    return Buffer.from(await response.arrayBuffer());
                }
            }
        } catch (e) {
            console.log(`[ATTP] API Offline/Blocked -> Skipped`);
        }
    }
    
    // 2. THE ULTIMATE FALLBACK (Never fails)
    // If all animated APIs are down, we instantly generate a high-quality colorful static WebP sticker!
    console.log("[ATTP] Animated APIs down. Using ultra-stable static fallback...");
    try {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodedText}&background=random&color=fff&size=512&font-size=0.4&length=4`;
        // We use a global image proxy to convert the PNG to WhatsApp WebP format instantly
        const fallbackUrl = `https://wsrv.nl/?url=${encodeURIComponent(avatarUrl)}&output=webp`;
        
        const response = await fetch(fallbackUrl);
        if (response.ok) {
            return Buffer.from(await response.arrayBuffer());
        }
    } catch (e) {
        console.error("[ATTP] Even fallback failed:", e);
    }
    
    throw new Error("All connections failed. Check your PC network.");
}

module.exports = {
    name: "attp",
    alias: ["textsticker"],
    category: "sticker",
    description: "Text to animated/static sticker",
    usage: `${process.env.PREFIX || '.'}attp <text>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const text = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!text) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: "*_⚠️ Need text!_*\n_Example: .attp HI_" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        // 🔥 Dynamic Watermark Setup
        const botName = global.config?.BOT_NAME || global.getBotName(botNumber) || 'KIRA X MD';
        const senderName = msg.pushName || "User";

        let tempPath;
        try {
            // Fetch using our bulletproof function
            const buffer = await getAttpBuffer(text);

            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            tempPath = path.join(tempDir, `attp_${Date.now()}.webp`);
            fs.writeFileSync(tempPath, buffer);

            // 🔥 Add Dynamic Watermark (User Name • Bot Name)
            await addMetadata(tempPath, senderName, botName);

            // Send Sticker
            const stickerBuffer = fs.readFileSync(tempPath);
            await sock.sendMessage(jid, { sticker: stickerBuffer });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            // Cleanup
            fs.unlinkSync(tempPath);
            
        } catch (err) {
            console.error("ATTP Final Error:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: "*_⚠️ Network error. Please try again!_*" }, { quoted: msg });
            if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }
};