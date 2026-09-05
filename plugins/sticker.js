// plugins/sticker.js - KIRA X MD (Perfect Formatting & Album Support)
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const webp = require("node-webpmux");
const { getSettings } = require("../lib/database");

const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

async function addMetadata(webpFilePath, packName, authorName) {
    try {
        const img = new webp.Image();
        await img.load(webpFilePath);

        const exifJSON = {
            "sticker-pack-id": "kira-x-md-sticker",
            "sticker-pack-name": packName,
            "sticker-author-name": authorName || "",
            "emojis": ["🔥", "✨"]
        };

        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(exifJSON), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);

        img.exif = exif;
        await img.save(webpFilePath);
    } catch (error) {
        console.error("Metadata error:", error);
    }
}

async function processAndSendSticker(sock, msg, mediaMsg, packName, authorName) {
    const jid = msg.key.remoteJid;
    let inputPath, outputPath;

    try {
        const buffer = await downloadMediaMessage(
            { message: mediaMsg },
            "buffer",
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const isImage = !!mediaMsg.imageMessage;
        const isVideo = !!mediaMsg.videoMessage;

        if (isImage) {
            inputPath = path.join(tempDir, `in_${Date.now()}_${Math.random()}.jpg`);
            outputPath = path.join(tempDir, `out_${Date.now()}_${Math.random()}.webp`);
            fs.writeFileSync(inputPath, buffer);

            await sharp(inputPath)
                .resize(512, 512, { 
                    fit: "contain", 
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .webp({ quality: 90 })
                .toFile(outputPath);
        } else if (isVideo) {
            inputPath = path.join(tempDir, `in_${Date.now()}_${Math.random()}.mp4`);
            outputPath = path.join(tempDir, `out_${Date.now()}_${Math.random()}.webp`);
            fs.writeFileSync(inputPath, buffer);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .inputOptions(["-t", "10"])
                    .outputOptions([
                        "-vcodec", "libwebp",
                        "-vf", "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0",
                        "-loop", "0",
                        "-preset", "default",
                        "-an",
                        "-vsync", "0",
                        "-q:v", "50"
                    ])
                    .toFormat("webp")
                    .on("end", resolve)
                    .on("error", reject)
                    .save(outputPath);
            });
        } else {
            return;
        }

        await addMetadata(outputPath, packName, authorName);

        const stickerBuffer = fs.readFileSync(outputPath);
        await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });

        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (err) {
        console.error("Single sticker error:", err);
        if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
}

module.exports = {
    name: "sticker",
    alias: ["s", "stik"],
    category: "sticker",
    description: "Convert single/album/multiple images to stickers exactly as configured",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const currentMsg = msg.message;

        let mediaList = [];

        // 1. Direct media caption command
        if (currentMsg?.imageMessage || currentMsg?.videoMessage) {
            mediaList.push(currentMsg);
        }
        // 2. Reply to media or album
        else if (quoted) {
            let mediaMsg = quoted;
            if (quoted.viewOnceMessageV2) mediaMsg = quoted.viewOnceMessageV2.message;
            else if (quoted.viewOnceMessage) mediaMsg = quoted.viewOnceMessage.message;

            if (quoted.albumMessage && quoted.albumMessage.messages) {
                for (const subMsg of quoted.albumMessage.messages) {
                    if (subMsg.message?.imageMessage || subMsg.message?.videoMessage) {
                        mediaList.push(subMsg.message);
                    }
                }
            } 
            else if (mediaMsg?.imageMessage || mediaMsg?.videoMessage) {
                mediaList.push(mediaMsg);
            }
        }

        if (mediaList.length === 0) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: "⚠️ *Please reply to an image/video or album!*" }, { quoted: msg });
        }

        // Fetch configured packName and author from database or environment variables
        const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
        const config = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};
        
        let packName = config.packName || (process.env.PACK_NAME ? process.env.PACK_NAME.replace(/\\n/g, '\n') : "KIRA X MD");
        let authorName = config.authorName || process.env.AUTHOR_NAME || "";

        // Extract custom text safely without splitting command aliases improperly
        const rawText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const match = rawText.match(/^[^\w\s]*\s*(?:sticker|stik|s)(?:\s+([\s\S]*))?$/i);
        const body = match && match[1] ? match[1] : "";

        if (body.trim()) {
            if (body.includes("|")) {
                const parts = body.split("|");
                packName = parts[0];
                authorName = parts.slice(1).join("|");
            } else {
                packName = body;
                authorName = "";
            }
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        // Process all items in list
        for (const media of mediaList) {
            let mMsg = media;
            if (mMsg.viewOnceMessageV2) mMsg = mMsg.viewOnceMessageV2.message;
            else if (mMsg.viewOnceMessage) mMsg = mMsg.viewOnceMessage.message;

            await processAndSendSticker(sock, msg, mMsg, packName, authorName);
        }

        await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    }
};

