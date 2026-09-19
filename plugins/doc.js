const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "doc",
    alias: ["document"],
    category: "media",
    description: "Convert replied media to document",
    usage: `${process.env.PREFIX || '.'}doc (reply to any media)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage && !quoted.audioMessage && !quoted.stickerMessage && !quoted.documentMessage)) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const ext = (quoted.imageMessage ? '.jpg' : quoted.videoMessage ? '.mp4' : quoted.audioMessage ? '.mp3' : '.webp');
            outputPath = path.join(tempDir, `doc_${Date.now()}${ext}`);
            fs.writeFileSync(outputPath, buffer);
            const fileName = `document_${Date.now()}${ext}`;
            await sock.sendMessage(jid, { document: fs.readFileSync(outputPath), mimetype: 'application/octet-stream', fileName });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};