const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// പാത്ത് പ്രശ്നം പരിഹരിച്ചു (ബോട്ടിന്റെ റൂട്ട് ഫോൾഡറിൽ temp ഉണ്ടാക്കും)
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

module.exports = {
    name: "circle",
    alias: ["circular"],
    category: "media",
    description: "Convert image/video to circular sticker (static)",
    usage: `${process.env.PREFIX || '.'}circle (reply to image/video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage))
            return sock.sendMessage(jid, { text: "❌ *Reply to an image or video!*" }, { quoted: msg });
            
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: "⚪ *Creating circular sticker...*" });
        
        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            const isVideo = !!quoted.videoMessage;
            inputPath = path.join(tempDir, `circle_in_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
            outputPath = path.join(tempDir, `circle_out_${Date.now()}.webp`);
            fs.writeFileSync(inputPath, buffer);

            if (isVideo) {
                const framePath = path.join(tempDir, `circle_frame_${Date.now()}.jpg`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .inputOptions(["-ss 0"])
                        .outputOptions(["-vframes 1"])
                        .output(framePath)
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });
                await sharp(framePath)
                    .resize(512, 512, { fit: "cover" })
                    .composite([{ input: Buffer.from(`<svg><circle cx="256" cy="256" r="256" fill="white"/></svg>`), blend: "dest-in" }])
                    .webp()
                    .toFile(outputPath);
                fs.unlinkSync(framePath);
            } else {
                await sharp(inputPath)
                    .resize(512, 512, { fit: "cover" })
                    .composite([{ input: Buffer.from(`<svg><circle cx="256" cy="256" r="256" fill="white"/></svg>`), blend: "dest-in" }])
                    .webp()
                    .toFile(outputPath);
            }
            const stickerBuffer = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, { sticker: stickerBuffer });
            await sock.sendMessage(jid, { text: "✅ *Circular sticker ready!*", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: "❌ *Failed to create sticker!*", edit: statusMsg.key });
        } finally { 
            try { 
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); 
            } catch(e) {} 
        }
    }
};