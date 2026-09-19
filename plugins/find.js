const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { Shazam } = require("node-shazam");

module.exports = {
    name: "find",
    alias: ["identify", "whatsong", "shazam"],
    category: "media",
    description: "Identify song from replied audio/video using Shazam",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
            return await sock.sendMessage(jid, { 
                text: `╭──『 🎵 *FIND SONG* 』──⊷\n│ ❌ *Media missing!*\n│ ➢ Reply to an Audio or Video.\n╰──────────────⊷` 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

            // 1. വാട്സ്ആപ്പിൽ നിന്നും മീഡിയ ഡൗൺലോഡ് ചെയ്യുന്നു
            const mediaBuffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, {});
            if (!mediaBuffer) throw new Error("Failed to download media buffer");
            
            // 2. പാക്കേജിന് പ്രോസസ്സ് ചെയ്യാൻ വേണ്ടി താൽക്കാലികമായി ഒരു ഫയൽ ഉണ്ടാക്കുന്നു
            const tmpPath = path.join(__dirname, `temp_audio_${Date.now()}.mp3`);
            fs.writeFileSync(tmpPath, mediaBuffer);

            // 3. Shazam NPM വെച്ച് പാട്ട് കണ്ടുപിടിക്കുന്നു
            const shazam = new Shazam();
            const res = await shazam.recognise(tmpPath);
            
            // 4. താൽക്കാലിക ഫയൽ ഡിലീറ്റ് ചെയ്യുന്നു (സ്റ്റോറേജ് നിറയാതിരിക്കാൻ)
            fs.unlinkSync(tmpPath);

            if (!res || !res.track) {
                throw new Error("Song not recognized by Shazam");
            }

            // 5. റിസൾട്ട് എടുക്കുന്നു
            const track = res.track;
            const title = track.title;
            const artist = track.subtitle;
            const image = track.images?.coverart || "https://telegra.ph/file/0c32688031d27944062a7.jpg";
            const genre = track.genres?.primary;
            const shazamUrl = track.share?.href;
            
            let caption = `╭──『 🎵 *SONG IDENTIFIED* 』──⊷\n│\n`;
            caption += `│ 📀 *Title :* ${title || "Unknown"}\n`;
            caption += `│ 🎤 *Artist :* ${artist || "Unknown"}\n`;
            
            if (genre) caption += `│ 🎼 *Genre :* ${genre}\n`;
            caption += `│\n╰──────────────⊷\n\n`;
            if (shazamUrl) caption += `🔗 *Listen on Shazam:*\n${shazamUrl}`;

            // റിസൾട്ട് അയക്കുന്നു
            await sock.sendMessage(jid, { 
                image: { url: image }, 
                caption 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Shazam Error:", err.message); 
            await sock.sendMessage(jid, { 
                text: `╭──『 ❌ *ERROR* 』──⊷\n│ Failed to identify. Song not recognized or unsupported format.\n╰──────────────⊷` 
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};