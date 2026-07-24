const axios = require('axios');

module.exports = {
    name: 'twitter',
    alias: ['tw', 'twdl', 'x'],
    category: 'downloader',
    description: 'Download Twitter (X) videos in HD',
    usage: `${process.env.PREFIX || '.'}twitter <url>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const url = args[0]?.trim();

        if (!url || (!url.includes('twitter.com') && !url.includes('x.com'))) {
            return sock.sendMessage(jid, { 
                text: `❌ *Invalid URL*\n\n➤ Example: ${process.env.PREFIX || '.'}twitter https://x.com/...` 
            }, { quoted: msg });
        }

        // ⏳ Reaction മാത്രം
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const apiUrl = `https://www.movanest.xyz/v2/ssstwitter?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 20000 }); 

            const resultData = res.data?.data || res.data?.result || res.data;
            if (!resultData) throw new Error("No data received from API");

            let videoUrl = resultData?.video_hd || resultData?.hd || resultData?.video_sd || resultData?.sd || resultData?.video || resultData?.url;
            
            if (!videoUrl && Array.isArray(resultData?.media) && resultData.media.length > 0) {
                videoUrl = resultData.media[0]?.url || resultData.media[0];
            }

            if (!videoUrl) throw new Error("Could not extract video link. Maybe it's an image-only tweet.");

            // 📝 ക്യാപ്ഷൻ കൃത്യമായി എടുക്കാൻ API തരാൻ സാധ്യതയുള്ള എല്ലാ പേരുകളും ചെക്ക് ചെയ്യുന്നു
            const tweetText = resultData?.desc || resultData?.title || resultData?.text || resultData?.description || resultData?.caption;
            
            let captionText = "> *KIRA X MD*";
            if (tweetText) {
                // വീഡിയോയുടെ കൂടെ ക്യാപ്ഷൻ ആഡ് ചെയ്യുന്നു
                captionText = `📝 *Caption:*\n${tweetText}\n\n${captionText}`;
            }

            // Fetch Failed ഒഴിവാക്കാൻ ബഫർ ആയി ഡൗൺലോഡ് ചെയ്യുന്നു
            const videoBuffer = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            // വീഡിയോയും ക്യാപ്ഷനും അയക്കുന്നു
            await sock.sendMessage(jid, {
                video: videoBuffer.data, 
                caption: captionText
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Twitter DL Error:", err.message);
            await sock.sendMessage(jid, { text: `❌ *Download Failed!*\nEnsure the tweet contains a video or try again later.` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};