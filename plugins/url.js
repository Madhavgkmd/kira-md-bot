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
            return await sock.sendMessage(jid, { text: `⚠️ *Reply to an image/video/audio/document!*` }, { quoted: msg });
        }

        // Baileys-ന് ഡൗൺലോഡ് ചെയ്യാൻ പാകത്തിൽ മെസ്സേജ് ഫോർമാറ്റ് ചെയ്യുന്നു
        const targetMessage = quoted ? { message: quoted } : msg;
        
        // Mime Type കൃത്യമായി എടുക്കാൻ
        const mediaObj = quoted ? quoted : msg.message;
        const mediaType = Object.keys(mediaObj).find(key => 
            ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(key)
        );

        if (!mediaType) {
            return await sock.sendMessage(jid, { text: `⚠️ *Valid media not found!*` }, { quoted: msg });
        }

        const mime = mediaObj[mediaType]?.mimetype || '';

        try {
            // ⏳ ലോഡിങ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            // 1. മീഡിയ ഡൗൺലോഡ് ചെയ്യുന്നു
            const mediaBuffer = await downloadMediaMessage(targetMessage, "buffer", {}, { logger: console });
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

            const fileName = `media_${Date.now()}.${ext}`;
            let uploadedUrl = null;

            // 🔥 3-Fallback Upload System (Catbox -> Uguu -> Pomf)
            const uploaders = [
                // 1. Catbox
                async () => {
                    const form = new FormData();
                    form.append("reqtype", "fileupload");
                    form.append("fileToUpload", mediaBuffer, { filename: fileName });
                    const res = await axios.post("https://catbox.moe/user/api.php", form, {
                        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
                        timeout: 30000
                    });
                    const link = res.data.trim();
                    if (!link.startsWith("http")) throw new Error("Catbox invalid response");
                    return link;
                },
                // 2. Uguu.se (Fallback 1)
                async () => {
                    const form = new FormData();
                    form.append("files[]", mediaBuffer, { filename: fileName });
                    const res = await axios.post("https://uguu.se/upload.php", form, {
                        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
                        timeout: 30000
                    });
                    return res.data.files[0].url;
                },
                // 3. Pomf.lain.la (Fallback 2)
                async () => {
                    const form = new FormData();
                    form.append("files[]", mediaBuffer, { filename: fileName });
                    const res = await axios.post("https://pomf.lain.la/upload.php", form, {
                        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
                        timeout: 30000
                    });
                    return res.data.files[0].url;
                }
            ];

            // ഓരോന്നായി ട്രൈ ചെയ്യുന്നു, ഒരെണ്ണം സക്സസ് ആയാൽ ലൂപ്പ് നിർത്തും
            for (const upload of uploaders) {
                try {
                    uploadedUrl = await upload();
                    if (uploadedUrl) break; 
                } catch (e) {
                    console.log(`Upload fallback triggered:`, e.message);
                }
            }

            if (!uploadedUrl) {
                throw new Error("All upload servers failed.");
            }

            // 4. വാട്ടർമാർക്ക് ഇല്ലാതെ ക്ലീൻ ആയി റിസൾട്ട് അയക്കുന്നു
            await sock.sendMessage(jid, { text: `🔗 *Direct URL:*\n\n${uploadedUrl}` }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("URL UPLOAD ERROR:", err.message);
            
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            
            // ❌ ക്ലീൻ എറർ മെസ്സേജ്
            await sock.sendMessage(jid, { text: `❌ *Failed to generate link. Servers might be busy!*` }, { quoted: msg });
        }
    }
};