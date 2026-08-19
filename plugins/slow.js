const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "slow",
    alias: ["slowed"],
    category: "media",
    description: "Slow down audio (slowed + reverb effect)",
    usage: `${process.env.PREFIX || '.'}slow (reply to audio/video)`,

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
            inputPath = path.join(tempDir, `slow_in_${Date.now()}.mp4`);
            outputPath = path.join(tempDir, `slow_out_${Date.now()}.mp3`);
            fs.writeFileSync(inputPath, buffer);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .audioFilter("atempo=0.5")
                    .outputOptions(["-af", "asetrate=44100*0.9"])
                    .output(outputPath)
                    .on("end", resolve)
                    .on("error", reject)
                    .run();
            });

            // ക്യാപ്ഷൻ ഇല്ലാതെ ഓഡിയോ ഫയൽ അയക്കുന്നു (+ ഒറിജിനൽ മെസ്സേജിലേക്ക് റിപ്ലൈ ആയി)
            await sock.sendMessage(jid, { 
                audio: { url: outputPath }, 
                mimetype: "audio/mpeg", 
                ptt: false 
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            try {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                // ശ്രദ്ധിക്കുക: ഫയൽ url വഴി അയക്കുമ്പോൾ ffmpeg പൂർത്തിയാകുന്ന മുമ്പേ ഡിലീറ്റ് ആവാതിരിക്കാൻ 
                // കുറച്ചു സമയം കഴിഞ്ഞ് ഡിലീറ്റ് ചെയ്യാൻ വെക്കുന്നതാണ് നല്ലത്, അല്ലെങ്കിൽ ബഫർ വഴി അയക്കാം.
            } catch (e) {}
        }
    }
};