const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// Ensure FFmpeg is found
const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = [
    {
        name: "bass",
        alias: ["bassboost"],
        category: "media",
        description: "Add bass boost to audio",
        usage: `${process.env.PREFIX || '.'}bass (reply to audio/video)`,

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // Check if quoted message is audio/video
            if (!quoted || (!quoted.audioMessage && !quoted.videoMessage && !quoted.documentMessage)) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(jid, { text: "*_⚠️ Reply to an audio or video file!_*" }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            let inputPath, outputPath;
            try {
                const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
                const tempDir = path.join(__dirname, "../temp");
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                
                inputPath = path.join(tempDir, `bass_in_${Date.now()}.tmp`);
                outputPath = path.join(tempDir, `bass_out_${Date.now()}.mp3`);
                fs.writeFileSync(inputPath, buffer);

                // Using a more universal bass filter
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .audioFilter("bass=g=15:f=110:w=0.5") // More effective bass boost filter
                        .toFormat("mp3")
                        .on("end", resolve)
                        .on("error", reject)
                        .save(outputPath);
                });

                // Send as Audio
                const audioBuffer = fs.readFileSync(outputPath);
                await sock.sendMessage(jid, { 
                    audio: audioBuffer, 
                    mimetype: "audio/mp4", 
                    ptt: false 
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Bass Error:", err);
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: "*_⚠️ Error processing audio!_*" }, { quoted: msg });
            } finally {
                try {
                    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (e) {}
            }
        }
    },
    {
        name: "wave",
        alias: ["8d", "vaporwave"],
        category: "media",
        description: "Apply 8D Wave effect to audio",
        usage: `${process.env.PREFIX || '.'}wave (reply to audio/video)`,

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // Check if quoted message is audio/video
            if (!quoted || (!quoted.audioMessage && !quoted.videoMessage && !quoted.documentMessage)) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(jid, { text: "*_⚠️ Reply to an audio or video file!_*" }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            let inputPath, outputPath;
            try {
                const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
                const tempDir = path.join(__dirname, "../temp");
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                
                inputPath = path.join(tempDir, `wave_in_${Date.now()}.tmp`);
                outputPath = path.join(tempDir, `wave_out_${Date.now()}.mp3`);
                fs.writeFileSync(inputPath, buffer);

                // Apply 8D Wave panning effect
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .audioFilter("apulsator=hz=0.08") 
                        .toFormat("mp3")
                        .on("end", resolve)
                        .on("error", reject)
                        .save(outputPath);
                });

                // Send as Audio
                const audioBuffer = fs.readFileSync(outputPath);
                await sock.sendMessage(jid, { 
                    audio: audioBuffer, 
                    mimetype: "audio/mp4", 
                    ptt: false 
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Wave Error:", err);
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: "*_⚠️ Error processing audio!_*" }, { quoted: msg });
            } finally {
                try {
                    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (e) {}
            }
        }
    }
];