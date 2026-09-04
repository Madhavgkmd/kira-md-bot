// plugins/take.js - KIRA X MD 
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const webp = require("node-webpmux");

async function addMetadata(webpFilePath, packName, authorName) {
    const img = new webp.Image();
    await img.load(webpFilePath);

    const exifJSON = {
        "sticker-pack-id": "kira-x-md-take",
        "sticker-pack-name": packName,
        "sticker-author-name": authorName,
        "emojis": ["🔥", "✨"]
    };

    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(exifJSON), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    img.exif = exif;
    await img.save(webpFilePath);
}

module.exports = {
    name: "take",
    alias: ["wm", "steal"],
    category: "sticker",
    description: "Change sticker watermark exactly as typed",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) return await sock.sendMessage(jid, { text: "❌ *Reply to the sticker you want to take!*" }, { quoted: msg });

        let mediaMsg = quoted;
        if (quoted.viewOnceMessageV2) mediaMsg = quoted.viewOnceMessageV2.message;
        else if (quoted.viewOnceMessage) mediaMsg = quoted.viewOnceMessage.message;

        if (!mediaMsg.stickerMessage) return await sock.sendMessage(jid, { text: "❌ *That's not a sticker.*" }, { quoted: msg });

        const rawText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        
        // കമാൻഡും അലിയാസുകളും പ്രിഫിക്സിനൊപ്പം സ്പേസ് ഉണ്ടെങ്കിലും കൃത്യമായി നീക്കം ചെയ്യുന്നു
        const body = rawText.replace(/^[^\w\s]*\s*(take|wm|steal)\s*/i, '');

        let packName = "KIRA X MD";
        let authorName = "";
        
        if (body.trim()) {
            if (body.includes("|")) {
                const parts = body.split("|");
                packName = parts[0]; 
                authorName = parts.slice(1).join("|");
            } else {
                packName = body;
                authorName = ""; 
            }
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let inputPath;
        try {
            const buffer = await downloadMediaMessage({ message: mediaMsg }, "buffer", {}, {});
            if (!buffer) throw new Error("Buffer download failed!");

            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            inputPath = path.join(tempDir, `take_${Date.now()}.webp`);
            fs.writeFileSync(inputPath, buffer);

            await addMetadata(inputPath, packName, authorName);

            const sticker = fs.readFileSync(inputPath);
            await sock.sendMessage(jid, { sticker }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            
        } catch (err) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        }
    }
};

