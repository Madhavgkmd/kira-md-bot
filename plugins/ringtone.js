const axios = require('axios');

module.exports = {
    name: 'ringtone',
    alias: ['rt', 'rtone'],
    category: 'search',
    description: 'Download the best ringtone instantly',
    usage: '.ringtone <song name>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(jid, { 
                text: `❌ *What ringtone do you want?*\n\n➤ Example: .ringtone past lives` 
            }, { quoted: msg });
        }

        // 🎧 ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

        try {
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

            // 2. ഫയൽ സേവ് ചെയ്യാതെ നേരിട്ട് ബഫർ ആയി എടുക്കുന്നു (Single tick പ്രശ്നം മാറാൻ)
            const audioBuffer = await axios.get(audioUrl, { 
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 20000
            });

            // 3. 🎵 ബഫർ വെച്ച് നേരിട്ട് വാട്സ്ആപ്പിലേക്ക് അയക്കുന്നു (No Watermark)
            await sock.sendMessage(jid, {
                audio: audioBuffer.data, 
                mimetype: 'audio/mpeg',
                ptt: false, 
                fileName: `${title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: `🎵 ${title}`,
                        body: "Ringtone Downloaded",
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
            
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            
            // സ്മൂത്ത് എറർ മെസ്സേജ്
            await sock.sendMessage(jid, { text: `❌ Something went wrong or song not found. Try again later!` }, { quoted: msg });
        }
    }
};