const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const axios = require("axios");
const FormData = require("form-data");

module.exports = {
    name: "url",
    alias: ["upload", "link", "tourl"],
    category: "tools",
    description: "Convert media to a direct URL link",
    usage: ".url (reply to media or send with caption)",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        
        // Quoted message ഉണ്ടോ എന്ന് നോക്കുന്നു
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // നേരിട്ട് മീഡിയ അയച്ചതാണോ എന്ന് നോക്കുന്നു
        const isDirectMedia = msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.documentMessage;

        if (!isDirectMedia && !quoted) {
            await sock.sendMessage(jid, { react: { text: "⚠️", key: msg.key } });
            return await sock.sendMessage(jid, { text: "⚠️ *Reply to an image/video/audio, or send media with .url caption!*" }, { quoted: msg });
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
            return await sock.sendMessage(jid, { text: "⚠️ *Valid media not found!*" }, { quoted: msg });
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

            // 3. Catbox-ലേക്ക് അപ്‌ലോഡ് ചെയ്യുന്നു
            const form = new FormData();
            form.append("reqtype", "fileupload");
            form.append("fileToUpload", mediaBuffer, { filename: `kira_media.${ext}` });

            const res = await axios.post("https://catbox.moe/user/api.php", form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity, // ഫയൽ സൈസ് എറർ ഒഴിവാക്കാൻ
                maxBodyLength: Infinity,
                timeout: 60000 // 60 സെക്കൻഡ് വരെ ടൈംഔട്ട്
            });

            const link = res.data.trim();
            if (!link.startsWith("http")) {
                throw new Error(`Catbox Error: ${link}`); // Catbox റിജക്ട് ചെയ്താൽ എറർ പിടിക്കാൻ
            }

            // 4. റിസൾട്ട് അയക്കുന്നു 
            await sock.sendMessage(jid, { text: link }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("URL UPLOAD ERROR:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: "❌ *Failed to generate link. Try again!*" }, { quoted: msg });
        }
    }
};