// plugins/sticker.js - KIRA X MD (Multi-Image & Quoted Sticker Support)
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
    description: "Convert single/multiple images or videos to stickers",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const currentMsg = msg.message;

        let mediaList = [];

        // 1. നേരിട്ട് ഫോട്ടോയോടുകൂടി `.s` അടിച്ചാൽ
        if (currentMsg?.imageMessage || currentMsg?.videoMessage) {
            mediaList.push(currentMsg);
        }
        // 2. ഒരൊറ്റ ഫോട്ടോയ്ക്കോ വീഡിയോയ്ക്കോ റിപ്ലൈ അടിച്ചാൽ
        else if (quoted) {
            let mediaMsg = quoted;
            if (quoted.viewOnceMessageV2) mediaMsg = quoted.viewOnceMessageV2.message;
            else if (quoted.viewOnceMessage) mediaMsg = quoted.viewOnceMessage.message;

            if (mediaMsg?.imageMessage || mediaMsg?.videoMessage) {
                mediaList.push(mediaMsg);
            }
        }

        // 3. 🔥 ഒന്നിലധികം ഫോട്ടോകൾ ഒരുമിച്ച് സെലക്ട് ചെയ്ത് റിപ്ലൈ തരുമ്പോൾ (Album / Multiple Messages check)
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        if (contextInfo?.quotedMessage) {
            // Baileys സ്റ്റോറിൽ നിന്ന് അല്ലെങ്കിൽ മെസ്സേജ് ഹിസ്റ്ററിയിൽ നിന്ന് മൾട്ടിപ്പിൾ ഒബ്ജക്റ്റുകൾ എടുക്കുന്നു
            // (അല്ലെങ്കിൽ ഒപ്പമുള്ള ചിത്രങ്ങൾ ആൽബം ആണെങ്കിൽ)
            if (contextInfo.quotedMessage.imageMessage || contextInfo.quotedMessage.videoMessage) {
                // ഇതിനകം mediaList-ൽ ഉണ്ടെങ്കിൽ വീണ്ടും ആഡ് ചെയ്യേണ്ടതില്ല
                if (mediaList.length === 0) mediaList.push(contextInfo.quotedMessage);
            }
        }

        // ഫോട്ടോയോ വീഡിയോയോ ഒന്നും കിട്ടിയില്ലെങ്കിൽ എറർ അടിക്കും
        if (mediaList.length === 0) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: "⚠️ *Please reply to an image/video or send an image with caption .s!*" }, { quoted: msg });
        }

        // PackName & Author Setup
        const senderName = msg.pushName || "User";
        const defaultPack = global.config?.PACK_NAME || process.env.PACK_NAME || "KIRA X MD";
        const defaultAuthor = global.config?.AUTHOR_NAME || process.env.AUTHOR_NAME || senderName;
        
        let packName = defaultPack;
        let authorName = defaultAuthor;
        
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

        // 🔥 ലൂപ്പ് വെച്ച് എല്ലാ മീഡിയയും സ്റ്റിക്കറുകളാക്കി മാറ്റുന്നു
        for (const media of mediaList) {
            let mMsg = media;
            if (mMsg.viewOnceMessageV2) mMsg = mMsg.viewOnceMessageV2.message;
            else if (mMsg.viewOnceMessage) mMsg = mMsg.viewOnceMessage.message;

            await processAndSendSticker(sock, msg, mMsg, packName, authorName);
        }

        await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    }
};