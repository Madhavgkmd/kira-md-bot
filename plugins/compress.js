const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
    name: "compress",
    category: "media",
    description: "Compress image/video by percentage (10-95)",
    usage: `${process.env.PREFIX || '.'}compress <percent> (reply to image/video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const percent = parseInt(args?.[0]);
        
        if (isNaN(percent) || percent < 10 || percent > 95) {
            return await sock.sendMessage(jid, { text: "*_⚠️ Use: .compress 50 (Reply to media)_*" }, { quoted: msg });
        }

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
            return await sock.sendMessage(jid, { text: "*_⚠️ Reply to an image or video!_*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            const isVideo = !!quoted.videoMessage;
            inputPath = path.join(tempDir, `comp_in_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
            outputPath = path.join(tempDir, `comp_out_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
            fs.writeFileSync(inputPath, buffer);

            if (isVideo) {
                // Video Compression
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .videoCodec("libx264")
                        .outputOptions([
                            "-preset ultrafast", // Faster compression
                            "-crf 28",           // Balanced quality
                            "-c:a aac", 
                            "-b:a 64k"           // Lower audio bitrate to save space
                        ])
                        .toFormat("mp4")
                        .on("end", resolve)
                        .on("error", reject)
                        .save(outputPath);
                });
                await sock.sendMessage(jid, { video: fs.readFileSync(outputPath), caption: "✅ Compressed Video" });
            } else {
                // Image Compression (Sharp)
                await sharp(inputPath)
                    .jpeg({ quality: percent }) // Direct percentage control
                    .toFile(outputPath);
                await sock.sendMessage(jid, { image: fs.readFileSync(outputPath), caption: "✅ Compressed Image" });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Compress Error:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};