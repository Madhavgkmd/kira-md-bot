const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "resize",
    category: "media",
    description: "Change aspect ratio (e.g., 16:9, 9:16, 4:3)",
    usage: `${process.env.PREFIX || '.'}resize <ratio> (reply to image/video)\nExample: .resize 16:9`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        
        // 1. Ratio കൊടുത്തോ എന്ന് ചെക്ക് ചെയ്യുന്നു
        const inputRatio = (args && Array.isArray(args) ? args.join('') : '').trim();
        
        if (!inputRatio || !inputRatio.includes(':')) {
            return await sock.sendMessage(jid, { 
                text: "❌ *Please provide the ratio!*\n\n*Example:*\n.resize 9:16 (For Reels/Status)\n.resize 16:9 (For YouTube)\n.resize 1:1 (For Square)\n\n*(Reply to a video or image with this command)*" 
            }, { quoted: msg });
        }

        // 2. വീഡിയോയോ ഫോട്ടോയോ റിപ്ലൈ ചെയ്തോ എന്ന് ചെക്ക് ചെയ്യുന്നു
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
            return await sock.sendMessage(jid, { 
                text: "❌ *Please reply to an image or video!*" 
            }, { quoted: msg });
        }

        // Ratio നമ്പറുകൾ കറക്റ്റ് ആണോ എന്ന് ചെക്ക് ചെയ്യുന്നു
        const [wRatio, hRatio] = inputRatio.split(':').map(Number);
        if (isNaN(wRatio) || isNaN(hRatio)) {
            return await sock.sendMessage(jid, { 
                text: "❌ *Invalid ratio format! Use something like 16:9 or 9:16*" 
            }, { quoted: msg });
        }

        // എല്ലാം കറക്റ്റ് ആണെങ്കിൽ പ്രോസസ്സ് തുടങ്ങുന്നു
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const isVideo = !!quoted.videoMessage;
            const ext = isVideo ? 'mp4' : 'jpg';
            inputPath = path.join(tempDir, `resize_in_${Date.now()}.${ext}`);
            outputPath = path.join(tempDir, `resize_out_${Date.now()}.${ext}`);
            fs.writeFileSync(inputPath, buffer);

            // Determine target dimensions (1280 width, adjust height)
            let targetWidth = 1280;
            let targetHeight = Math.round(targetWidth * hRatio / wRatio);
            if (targetHeight % 2 !== 0) targetHeight++;
            if (targetHeight > 1280) {
                targetHeight = 1280;
                targetWidth = Math.round(targetHeight * wRatio / hRatio);
                if (targetWidth % 2 !== 0) targetWidth++;
            }

            if (isVideo) {
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .videoFilter(`scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`)
                        .outputOptions(["-c:v libx264", "-preset fast", "-crf 23", "-c:a copy"])
                        .output(outputPath)
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });
                const videoBuffer = fs.readFileSync(outputPath);
                // ക്യാപ്ഷൻ ഇല്ലാതെ വീഡിയോ അയക്കുന്നു
                await sock.sendMessage(jid, { video: videoBuffer, mimetype: 'video/mp4' }, { quoted: msg });
            } else {
                await sharp(inputPath)
                    .resize(targetWidth, targetHeight, { fit: "cover" })
                    .toFile(outputPath);
                const imgBuffer = fs.readFileSync(outputPath);
                // ക്യാപ്ഷൻ ഇല്ലാതെ ഫോട്ടോ അയക്കുന്നു
                await sock.sendMessage(jid, { image: imgBuffer }, { quoted: msg });
            }
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { 
                text: "❌ *Failed to resize the media!*" 
            }, { quoted: msg });
        } finally {
            try {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
        }
    }
};