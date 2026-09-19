const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "vnote",
    alias: ["vn", "ptt", "voicenote"],
    category: "utility",
    description: "Convert Audio/Video to a Perfect Voice Note (PTT)",
    usage: `${process.env.PREFIX || '.'}vnote (Reply to Audio or Video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return await sock.sendMessage(jid, { 
                text: "⚠️ *Reply to an Audio or Video file!*" 
            }, { quoted: msg });
        }

        const mime = Object.keys(quoted)[0];
        
        if (!['audioMessage', 'videoMessage', 'documentMessage'].includes(mime)) {
            return await sock.sendMessage(jid, { 
                text: "❌ *Unsupported format! Reply to an Audio or Video.*" 
            }, { quoted: msg });
        }

        // KIRA X MD - Reaction Only Loading
        await sock.sendMessage(jid, { react: { text: "🎙️", key: msg.key } });

        try {
            const msgType = mime.replace("Message", "");
            const stream = await downloadContentFromMessage(quoted[mime], msgType);
            
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const inputPath = path.join(tempDir, `input_${Date.now()}`);
            const outputPath = path.join(tempDir, `vnote_${Date.now()}.ogg`);

            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            fs.writeFileSync(inputPath, buffer);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat('ogg')
                    .audioCodec('libopus')
                    .addOutputOptions([
                        '-avoid_negative_ts make_zero',
                        '-ac 1', 
                        '-b:a 64k'
                    ])
                    .save(outputPath)
                    .on('end', resolve)
                    .on('error', reject);
            });

            const audioBuffer = fs.readFileSync(outputPath);

            const dummyWaveform = new Uint8Array(64);
            for (let i = 0; i < 64; i++) {
                dummyWaveform[i] = Math.floor(Math.random() * 100);
            }

            await sock.sendMessage(jid, {
                audio: audioBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
                waveform: dummyWaveform
            }, { quoted: msg });

            // Success Reaction
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        } catch (error) {
            console.error("VNOTE Error:", error);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { 
                text: "❌ *Conversion failed! Check if FFMPEG is installed on your server.*" 
            }, { quoted: msg });
        }
    }
};
