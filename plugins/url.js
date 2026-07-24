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
        
        // നേരിട്ട് ഫോട്ടോ അയച്ച് ക്യാപ്ഷൻ ആയി .url അടിച്ചാലും വർക്ക് ആവാൻ
        const isMedia = msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.documentMessage;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // റിപ്ലൈ ചെയ്തതാണോ അതോ ഡയറക്റ്റ് അയച്ചതാണോ എന്ന് നോക്കുന്നു
        const targetMessage = isMedia ? msg.message : quoted;

        if (!targetMessage) {
            await sock.sendMessage(jid, { react: { text: "⚠️", key: msg.key } });
            return await sock.sendMessage(jid, { text: "⚠️ *Reply to an image/video/audio, or send media with .url caption!*" }, { quoted: msg });
        }

        try {
            // ⏳ ലോഡിങ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            // 1. മീഡിയ ഡൗൺലോഡ് ചെയ്യുന്നു
            const mediaBuffer = await downloadMediaMessage({ message: targetMessage }, "buffer", {}, {});
            
            // 2. Mime Type കണ്ടുപിടിച്ച് ശരിയായ ഫയൽ എക്സ്റ്റൻഷൻ കൊടുക്കാൻ (ഇതാണ് പഴയ കോഡിലെ പ്രശ്നം പരിഹരിച്ചത്)
            const messageType = Object.keys(targetMessage)[0]; 
            const mime = targetMessage[messageType]?.mimetype || '';
            
            let ext = 'bin';
            if (mime.includes('image')) ext = 'jpg';
            else if (mime.includes('video')) ext = 'mp4';
            else if (mime.includes('audio')) ext = 'mp3';
            else if (mime.includes('pdf')) ext = 'pdf';

            // 3. Catbox-ലേക്ക് അപ്‌ലോഡ് ചെയ്യുന്നു
            const form = new FormData();
            form.append("reqtype", "fileupload");
            
            // .tmp മാറ്റി കറക്റ്റ് എക്സ്റ്റൻഷൻ കൊടുത്തു
            form.append("fileToUpload", mediaBuffer, { filename: `kira_media.${ext}` });

            const res = await axios.post("https://catbox.moe/user/api.php", form, {
                headers: form.getHeaders(),
                timeout: 30000 // വലിയ വീഡിയോ ഒക്കെ ആണെങ്കിൽ ടൈംഔട്ട് ആവാതിരിക്കാൻ
            });

            const link = res.data.trim();
            if (!link.startsWith("http")) throw new Error("Catbox returned invalid link");

            // 4. റിസൾട്ട് അയക്കുന്നു (വെറും ലിങ്ക് മാത്രം)
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