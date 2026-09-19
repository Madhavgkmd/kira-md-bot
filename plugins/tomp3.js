// plugins/tomp3.js - KIRA X MD (Anti-Hang Video to MP3 Fix)
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const { getSettings } = require("../lib/database");

const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

module.exports = {
    name: "tomp3",
    alias: ["mp3", "video2mp3", "toaudio"],
    category: "media",
    description: "Convert replied video to MP3 audio",
    usage: `${process.env.PREFIX || '.'}mp3 (reply to a video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // ബോട്ടിന്റെ നമ്പർ എടുക്കുന്നു
        const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";

        // ഡാറ്റാബേസിൽ നിന്നോ .env-ൽ നിന്നോ Dynamic ആയി പേരുകൾ എടുക്കുന്നു
        const settings = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};
        const botName = settings.botName || process.env.BOT_NAME || global.config?.BOT_NAME || 'KIRA X MD';
        const ownerName = settings.ownerName || process.env.OWNER_NAME || global.config?.OWNER_NAME || 'Madhav';

        // Disappearing / ViewOnce മെസ്സേജുകളിൽ നിന്നുള്ള വീഡിയോ കണ്ടെത്തുന്നു
        const videoMessage = quoted?.videoMessage || 
                             quoted?.ephemeralMessage?.message?.videoMessage || 
                             quoted?.viewOnceMessageV2?.message?.videoMessage;

        if (!videoMessage) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: "❌ *Please reply to a video!*" }, { quoted: msg });
        }

        console.log("⬇️ [toMP3] Starting download...");
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let inputPath, outputPath;
        try {
            const stream = await downloadContentFromMessage(videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            console.log("✅ [toMP3] Video downloaded successfully. Size:", buffer.length);

            if (buffer.length < 1000) {
                throw new Error("Downloaded video buffer is empty or corrupted.");
            }

            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            inputPath = path.join(tempDir, `video_${Date.now()}.mp4`);
            outputPath = path.join(tempDir, `audio_${Date.now()}.mp3`);
            
            fs.writeFileSync(inputPath, buffer);
            console.log("🔄 [toMP3] Starting FFmpeg conversion...");

            // FFmpeg വഴി dynamic ടാഗുകൾ ചേർക്കുന്നു
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat("mp3")
                    .audioBitrate(128)
                    .outputOptions([
                        '-metadata', `title=${botName}`, 
                        '-metadata', `artist=${ownerName}`,    
                        '-metadata', `album=${botName}`
                    ])
                    .on("end", () => {
                        console.log("✅ [toMP3] Conversion finished!");
                        resolve();
                    })
                    .on("error", (err) => {
                        console.error("❌ [toMP3] FFmpeg Error:", err.message);
                        reject(new Error(`FFmpeg crashed: ${err.message}`));
                    })
                    .save(outputPath);
            });

            const audioBuffer = fs.readFileSync(outputPath);
            console.log("📤 [toMP3] Sending Audio to WhatsApp...");
            
            await sock.sendMessage(jid, {
                audio: audioBuffer,
                mimetype: "audio/mp4",
                ptt: false, 
                fileName: `${botName.replace(/\s+/g, '_')}_${Date.now()}.mp3`,
            }, { quoted: msg }); 

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            console.log("🎉 [toMP3] Process completed successfully!");
            
        } catch (err) {
            console.error("❌ [toMP3] Master Error:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { 
                text: `❌ *Error processing video!*\n\n_Reason: ${err.message}_` 
            }, { quoted: msg });
            
        } finally {
            try {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
        }
    }
};

