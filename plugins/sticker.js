// plugins/sticker.js - KIRA X MD (Dynamic PackName Fix)
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const webp = require("node-webpmux");

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
            "sticker-pack-name": packName || "User",
            "sticker-author-name": authorName || "KIRA X MD",
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

module.exports = {
    name: "sticker",
    alias: ["s", "stik"],
    category: "sticker",
    description: "Convert image/video/GIF to high-quality sticker (Maintains Aspect Ratio)",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: "⚠️ *Reply to an image or video!*" }, { quoted: msg });
        }

        let mediaMsg = quoted;
        if (quoted.viewOnceMessageV2) mediaMsg = quoted.viewOnceMessageV2.message;
        else if (quoted.viewOnceMessage) mediaMsg = quoted.viewOnceMessage.message;

        const isImage = !!mediaMsg.imageMessage;
        const isVideo = !!mediaMsg.videoMessage;

        if (!isImage && !isVideo) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: "⚠️ *Only images and videos are supported!*" }, { quoted: msg });
        }

        // 🔥 Dynamic PackName & Author Setup from .env / Config
        const senderName = msg.pushName || "User";
        const defaultPack = global.config?.PACK_NAME || process.env.PACK_NAME || "KIRA X MD";
        const defaultAuthor = global.config?.AUTHOR_NAME || process.env.AUTHOR_NAME || senderName;
        
        let packName = defaultPack;
        let authorName = defaultAuthor;
        
        // കസ്റ്റം പേര് കൊടുക്കാൻ (ഉദാഹരണം: .s MyPack | MyAuthor)
        if (args && args.length > 0) {
            const fullText = args.join(" ");
            if (fullText.includes("|")) {
                const parts = fullText.split("|");
                packName = parts[0].trim();
                authorName = parts[1] ? parts[1].trim() : defaultAuthor;
            } else {
                packName = fullText.trim();
            }
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

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

            if (isImage) {
                inputPath = path.join(tempDir, `in_${Date.now()}.jpg`);
                outputPath = path.join(tempDir, `out_${Date.now()}.webp`);
                fs.writeFileSync(inputPath, buffer);

                await sharp(inputPath)
                    .resize(512, 512, { 
                        fit: "contain", 
                        background: { r: 0, g: 0, b: 0, alpha: 0 } 
                    })
                    .webp({ quality: 90 })
                    .toFile(outputPath);
            } else {
                inputPath = path.join(tempDir, `in_${Date.now()}.mp4`);
                outputPath = path.join(tempDir, `out_${Date.now()}.webp`);
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
                        .on("error", (err) => {
                            console.error("FFmpeg error:", err);
                            reject(err);
                        })
                        .save(outputPath);
                });
            }

            await addMetadata(outputPath, packName, authorName);

            const stickerBuffer = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        } catch (err) {
            console.error("Sticker error:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};