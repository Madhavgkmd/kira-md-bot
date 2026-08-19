const axios = require('axios');

module.exports = {
    name: 'twitter',
    alias: ['tw', 'twdl', 'x'],
    category: 'downloader',
    description: 'Download Twitter (X) videos/photos in HD',
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

            let mediaUrl = resultData?.video_hd || resultData?.hd || resultData?.video_sd || resultData?.sd || resultData?.video || resultData?.url;
            
            if (!mediaUrl && Array.isArray(resultData?.media) && resultData.media.length > 0) {
                mediaUrl = resultData.media[0]?.url || resultData.media[0];
            }

            if (!mediaUrl) throw new Error("Could not extract media link.");

            // 📝 ഒറിജിനൽ ക്യാപ്ഷൻ മാത്രം (വാട്ടർമാർക്കുകൾ പൂർണ്ണമായി ഒഴിവാക്കി)
            const tweetText = resultData?.desc || resultData?.title || resultData?.text || resultData?.description || resultData?.caption || "";
            
            // ഫെച്ച് ഫെയിൽ ഒഴിവാക്കാൻ ബഫർ ആയി ഡൗൺലോഡ് ചെയ്യുന്നു
            const mediaBuffer = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            // മീഡിയയുടെ തരം അനുസരിച്ച് (ഫോട്ടോയാണോ വീഡിയോയാണോ എന്ന് നോക്കി) അയക്കുന്നു
            const isVideo = mediaUrl.includes('.mp4') || resultData?.video || resultData?.video_hd || resultData?.hd;

            if (isVideo) {
                await sock.sendMessage(jid, {
                    video: mediaBuffer.data, 
                    caption: tweetText // ക്യാപ്ഷൻ ഉണ്ടെങ്കിൽ അത് മാത്രം, ഇല്ലെങ്കിൽ വെറും വീഡിയോ
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    image: mediaBuffer.data, 
                    caption: tweetText // ഫോട്ടോ ആണെങ്കിൽ ഫോട്ടോയും ഒറിജിനൽ ക്യാപ്ഷനും മാത്രം
                }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Twitter DL Error:", err.message);
            await sock.sendMessage(jid, { text: `❌ *Download Failed!*\nEnsure the tweet contains a valid media or try again later.` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};