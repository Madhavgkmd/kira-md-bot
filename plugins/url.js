// plugins/url.js - KIRA X MD (Media to Direct URL)
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const axios = require("axios");
const FormData = require("form-data");
const { getSettings } = require("../lib/database"); // ഡാറ്റാബേസ് സപ്പോർട്ടിനായി

module.exports = {
    name: "url",
    alias: ["upload", "link", "tourl"],
    category: "tools",
    description: "Convert media to a direct URL link",
    usage: ".url (reply to media or send with caption)",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        
        // ബോട്ടിന്റെ പേര് എടുക്കാൻ (Independent Bot Name Support)
        const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, "");
        const config = getSettings(botNumber);
        const botName = config?.botName || process.env.BOT_NAME || 'KIRA X MD';
        const WATERMARK = `\n\n──────────────\n> *${botName}*`;
        
        // Quoted message ഉണ്ടോ എന്ന് നോക്കുന്നു
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // നേരിട്ട് മീഡിയ അയച്ചതാണോ എന്ന് നോക്കുന്നു
        const isDirectMedia = msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.documentMessage;

        if (!isDirectMedia && !quoted) {
            await sock.sendMessage(jid, { react: { text: "⚠️", key: msg.key } });
            return await sock.sendMessage(jid, { text: `⚠️ *Reply to an image/video/audio, or send media with .url caption!*` + WATERMARK }, { quoted: msg });
        }

        // Baileys-ന് ഡൗൺലോഡ് ചെയ്യാൻ പാകത്തിൽ മെസ്സേജ് ഫോർമാറ്റ് ചെയ്യുന്നു
        const targetMessage = quoted ? { message: quoted } : msg;
        
        // Mime Type കൃത്യമായി എടുക്കാൻ
        const mediaObj = quoted ? quoted : msg.message;
        const mediaType = Object.keys(mediaObj).find(key => 
            ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(key)
        );

        if (!mediaType) {
            await sock.sendMessage(jid, { react: { text: "⚠️", key: msg.key } });
            return await sock.sendMessage(jid, { text: `⚠️ *Valid media not found!*` + WATERMARK }, { quoted: msg });
        }

        const mime = mediaObj[mediaType]?.mimetype || '';

        try {
            // ⏳ ലോഡിങ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            // 1. മീഡിയ ഡൗൺലോഡ് ചെയ്യുന്നു
            const mediaBuffer = await downloadMediaMessage(targetMessage, "buffer", {}, {});
            
            if (!mediaBuffer) throw new Error("Media download failed");

            // 2. Mime Type വെച്ച് എക്സ്റ്റൻഷൻ സെറ്റ് ചെയ്യുന്നു
            let ext = 'bin';
            if (mime.includes('image/jpeg') || mime.includes('image/jpg')) ext = 'jpg';
            else if (mime.includes('image/png')) ext = 'png';
            else if (mime.includes('image/webp')) ext = 'webp';
            else if (mime.includes('video/mp4')) ext = 'mp4';
            else if (mime.includes('audio')) ext = 'mp3';
            else if (mime.includes('pdf')) ext = 'pdf';
            else if (mime.includes('image')) ext = 'jpg';
            else if (mime.includes('video')) ext = 'mp4';

            // 3. Catbox-ലേക്ക് കൃത്യമായ ഫോർമാറ്റിൽ അപ്‌ലോഡ് ചെയ്യുന്നു
            const form = new FormData();
            form.append("reqtype", "fileupload");
            form.append("fileToUpload", mediaBuffer, { filename: `media_${Date.now()}.${ext}` });

            const res = await axios.post("https://catbox.moe/user/api.php", form, {
                headers: {
                    ...form.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 60000
            });

            const link = typeof res.data === 'string' ? res.data.trim() : '';
            if (!link.startsWith("http")) {
                throw new Error(`Catbox Error: Server rejected the file.`);
            }

            // 4. റിസൾട്ട് അയക്കുന്നു (Watermark സഹിതം)
            await sock.sendMessage(jid, { text: `🔗 *Direct URL Generated:*\n\n${link}` + WATERMARK }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("URL UPLOAD ERROR:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ *Failed to generate link. Try again!*` + WATERMARK }, { quoted: msg });
        }
    }
};