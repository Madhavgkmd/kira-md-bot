const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "sped",
    alias: ["speedup", "nightcore"],
    category: "media",
    description: "Speed up audio (nightcore effect)",
    usage: `${process.env.PREFIX || '.'}sped (reply to audio/video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            inputPath = path.join(tempDir, `sped_in_${Date.now()}.mp4`);
            outputPath = path.join(tempDir, `sped_out_${Date.now()}.mp3`);
            fs.writeFileSync(inputPath, buffer);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .audioFilter("atempo=1.5")
                    .outputOptions(["-af", "asetrate=44100*1.2"])
                    .output(outputPath)
                    .on("end", resolve)
                    .on("error", reject)
                    .run();
            });

            const audioBuffer = fs.readFileSync(outputPath);
await sock.sendMessage(jid, { 
                audio: audioBuffer, 
                mimetype: "audio/mpeg", 
                ptt: false 
            }, { quoted: msg });            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            try {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
        }
    }
};