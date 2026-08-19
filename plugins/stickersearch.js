// plugins/stickersearch.js – KIRA X MD (Sticker search using GIPHY)
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const webp = require("node-webpmux");
const axios = require("axios");

const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);

// ─── GIPHY API Key (hardcoded) ───
const GIPHY_API_KEY = "pSoNBnrVojxpnPY2PE36jEheh4sNy3cY";

// ─── Add metadata to sticker ───
async function addMetadata(webpFilePath, packName, authorName) {
    try {
        const img = new webp.Image();
        await img.load(webpFilePath);
        const exif = {
            "sticker-pack-id": "kira-x-md-sticker",
            "sticker-pack-name": packName || "KIRA X MD",
            "sticker-author-name": authorName || "User",
            "emojis": ["🔎", "✨"]
        };
        const jsonBuff = Buffer.from(JSON.stringify(exif), "utf-8");
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const finalExif = Buffer.concat([exifAttr, jsonBuff]);
        finalExif.writeUIntLE(jsonBuff.length, 14, 4);
        img.exif = finalExif;
        await img.save(webpFilePath);
    } catch (e) { console.error("Metadata error:", e); }
}

module.exports = {
    name: "stickersearch",
    alias: ["ssearch"],
    category: "sticker",
    description: "Search and send animated stickers from GIPHY",
    usage: `${process.env.PREFIX || '.'}stickersearch <keyword>`,

    execute: async (sock, msg, args) => {
        const jid = msg.key.remoteJid;
        const query = (args || []).join(' ');
        if (!query) {
            await sock.sendMessage(jid, { text: "⚠️ *Need a search term!*" }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

        try {
            // 🔥 Dynamic PackName & Author Helper from .env
            const packName = global.config?.PACK_NAME || process.env.PACK_NAME || 'KIRA X MD';
            const authorName = global.config?.AUTHOR_NAME || process.env.AUTHOR_NAME || msg.pushName || 'User';

            // ─── Search GIPHY Stickers ───
            const url = `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=10&rating=g`;
            const response = await axios.get(url, { timeout: 15000 });
            const data = response.data;

            if (!data.data || data.data.length === 0) {
                throw new Error("No stickers found");
            }

            // ─── Pick a random sticker ───
            const randomIndex = Math.floor(Math.random() * data.data.length);
            const stickerData = data.data[randomIndex];
            const mediaUrl = stickerData.images.original.url;

            if (!mediaUrl) throw new Error("No media URL");

            // ─── Download and convert ───
            const bufferRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 15000 });
            const buffer = Buffer.from(bufferRes.data);

            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const inputPath = path.join(tempDir, `ssearch_${Date.now()}.gif`);
            const outputPath = path.join(tempDir, `ssearch_${Date.now()}.webp`);
            fs.writeFileSync(inputPath, buffer);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .outputOptions([
                        "-vcodec libwebp",
                        "-vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=black@0",
                        "-loop 0",
                        "-preset default",
                        "-an",
                        "-vsync 0",
                        "-s 512x512"
                    ])
                    .toFormat("webp")
                    .on("error", reject)
                    .on("end", resolve)
                    .save(outputPath);
            });

            await addMetadata(outputPath, packName, authorName);
            await sock.sendMessage(jid, { sticker: fs.readFileSync(outputPath) }, { quoted: msg });

            if (fs.existsSync(inputPath)) fs.unlinkSync(inputpath = inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.error("StickerSearch Error:", e.message);
            await sock.sendMessage(jid, { text: `❌ *Failed to fetch sticker. Try another word.*` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};