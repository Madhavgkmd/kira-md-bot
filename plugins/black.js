const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

module.exports = {
    name: "black",
    category: "media",
    description: "Convert audio to black video",
    usage: `${process.env.PREFIX || '.'}black (reply to audio)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.audioMessage)
            return sock.sendMessage(jid, { text: "❌ Reply to an audio" }, { quoted: msg });
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: "🎬 Creating black video..." });
        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            inputPath = path.join(tempDir, `black_audio_${Date.now()}.mp3`);
            outputPath = path.join(tempDir, `black_video_${Date.now()}.mp4`);
            fs.writeFileSync(inputPath, buffer);

            // Alternative method: generate black frames using the "color" filter with a different syntax
            // This works on most ffmpeg builds without needing lavfi input format.
            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input('color=c=black:s=640x480:r=30')
                    .inputFormat('lavfi')  // Keep this; if fails, try without .inputFormat
                    .input(inputPath)
                    .outputOptions(['-shortest', '-c:v libx264', '-preset ultrafast', '-crf 23', '-c:a aac', '-b:a 128k', '-pix_fmt yuv420p'])
                    .output(outputPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            }).catch(async (err) => {
                // Fallback: use a single black image repeated
                console.log("Lavfi failed, falling back to image sequence...");
                const blackImagePath = path.join(tempDir, `black_img_${Date.now()}.png`);
                // Create a black image using sharp
                const sharp = require('sharp');
                await sharp({
                    create: { width: 640, height: 480, channels: 3, background: { r: 0, g: 0, b: 0 } }
                }).png().toFile(blackImagePath);
                await new Promise((resolve, reject) => {
                    ffmpeg()
                        .input(blackImagePath)
                        .inputOptions(['-loop 1'])
                        .input(inputPath)
                        .outputOptions(['-shortest', '-c:v libx264', '-preset ultrafast', '-crf 23', '-c:a aac', '-b:a 128k', '-pix_fmt yuv420p'])
                        .output(outputPath)
                        .on('end', resolve)
                        .on('error', reject)
                        .run();
                });
                fs.unlinkSync(blackImagePath);
            });

            const videoBuffer = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, { video: videoBuffer, mimetype: "video/mp4", caption: "🎬 Black video" });
            await sock.sendMessage(jid, { text: "✅ Done", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: "❌ Failed: " + err.message, edit: statusMsg.key });
        } finally { try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch(e) {} }
    }
};