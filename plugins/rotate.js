const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

module.exports = {
    name: "rotate",
    alias: ["rot"],
    category: "media",
    description: "Rotate video left/right",
    usage: `${process.env.PREFIX || '.'}rotate left|right (reply to video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.videoMessage) return sock.sendMessage(jid, { text: "❌ *Reply to a video!*" }, { quoted: msg });
        
        const dir = (args[0] || '').toLowerCase();
        if (dir !== 'left' && dir !== 'right') return sock.sendMessage(jid, { text: "❌ *Usage: .rotate left or .rotate right*" });
        
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔄 *Rotating ${dir}...*` });
        
        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            inputPath = path.join(tempDir, `rotate_in_${Date.now()}.mp4`);
            outputPath = path.join(tempDir, `rotate_out_${Date.now()}.mp4`);
            fs.writeFileSync(inputPath, buffer);
            
            const filter = dir === 'left' ? "transpose=2" : "transpose=1";
            
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath).videoFilter(filter).output(outputPath).on("end", resolve).on("error", reject).run();
            });
            
            const videoBuffer = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, { video: videoBuffer, mimetype: "video/mp4", caption: `🔄 *Rotated ${dir.toUpperCase()}*` }, { quoted: msg });
            await sock.sendMessage(jid, { text: "✅ *Done!*", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: "❌ *Failed to rotate video!*", edit: statusMsg.key });
        } finally { 
            try { 
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); 
            } catch (e) {} 
        }
    }
};