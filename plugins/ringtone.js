const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ringtone',
    alias: ['rt', 'rtone'],
    category: 'search',
    description: 'Download the best ringtone instantly',
    usage: `${process.env.PREFIX || '.'}ringtone <song name>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(jid, { 
                text: `❌ *What ringtone do you want?*\n\n➤ Example: ${process.env.PREFIX || '.'}ringtone past lives` 
            }, { quoted: msg });
        }

        // 🎧 ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

        let tempFilePath = null;

        try {
            // 🔥 Dynamic Bot Name Helper
            const botName = global.config?.BOT_NAME || process.env.BOT_NAME || 'KIRA X MD';

            // 1. API-ൽ നിന്ന് പാട്ട് തിരയുന്നു
            const apiUrl = `https://www.movanest.xyz/v2/ringtone?title=${encodeURIComponent(query)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });

            const results = res.data?.results;

            if (!results || results.length === 0) {
                throw new Error("No ringtones found!");
            }

            // ആദ്യത്തെ റിംഗ്ടോൺ എടുക്കുന്നു
            const bestRingtone = results[0];
            const audioUrl = bestRingtone.audio;
            const title = bestRingtone.title || query;

            if (!audioUrl) throw new Error("Audio link missing.");

            // 2. Axios ഉപയോഗിച്ച് ഓഡിയോ ഡൗൺലോഡ് ചെയ്ത് temp ഫോൾഡറിൽ ഫയൽ ആയി സേവ് ചെയ്യുന്നു (Single tick പ്രശ്നം ഒഴിവാക്കാൻ)
            const audioBuffer = await axios.get(audioUrl, { 
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            // സുരക്ഷിതമായ ഫയൽ നെയിം ഉണ്ടാക്കുന്നു
            const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
            tempFilePath = path.join(tempDir, `ringtone_${Date.now()}_${safeTitle}.mp3`);
            fs.writeFileSync(tempFilePath, audioBuffer.data);

            // 3. 🎵 ഫയൽ പാത്ത് ഉപയോഗിച്ച് വാട്സ്ആപ്പിലേക്ക് അയക്കുന്നു
            await sock.sendMessage(jid, {
                audio: { url: tempFilePath }, 
                mimetype: 'audio/mpeg',
                ptt: false, 
                fileName: `${title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: `🎵 ${title}`,
                        body: `${botName} • RINGTONE`,
                        mediaType: 1,
                        thumbnailUrl: "https://i.pinimg.com/736x/8f/3e/eb/8f3eeb0c1097bd5a3a0eec26f1c71285.jpg", // Dark aesthetic image
                        sourceUrl: audioUrl,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Ringtone Error:", err.message);
            await sock.sendMessage(jid, { text: `❌ *Failed to download!* Try another song.` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            // ടെമ്പ് ഫയൽ സുരക്ഷിതമായി ഡിലീറ്റ് ചെയ്യുന്നു
            try {
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            } catch (e) {}
        }
    }
};