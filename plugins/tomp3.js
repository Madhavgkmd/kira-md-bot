// plugins/tomp3.js - KIRA X MD (Anti-Hang Video to MP3)
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// Windows-ൽ ആണെങ്കിൽ ffmpeg എടുക്കാൻ (Railway/Linux ആണെങ്കിൽ ഓട്ടോമാറ്റിക് ആയി എടുത്തോളും)
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

        // 🔥 Disappearing Message ആണെങ്കിലും കൃത്യമായി വീഡിയോ എടുക്കാൻ
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
            // 🔥 Hang ആവാത്ത പുതിയ ഡൗൺലോഡ് സിസ്റ്റം
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

            // FFmpeg Conversion
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat("mp3")
                    .audioBitrate(128)
                    .outputOptions([
                        '-metadata', 'title=KIRA X MD', 
                        '-metadata', 'artist=Madhav',    
                        '-metadata', 'album=KIRA Bot'    
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
            
            // ഓഡിയോ വാട്സാപ്പിലേക്ക് അയക്കുന്നു
            await sock.sendMessage(jid, {
                audio: audioBuffer,
                mimetype: "audio/mp4", // വാട്സാപ്പിൽ നേരിട്ട് പ്ലേ ആവാൻ
                ptt: false, 
                fileName: `KIRA_X_MD_${Date.now()}.mp3`,
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
            // ടെമ്പ് ഫയലുകൾ ഡിലീറ്റ് ആക്കുന്നു
            try {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
        }
    }
};