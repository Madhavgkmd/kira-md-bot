// plugins/twitter.js – KIRA X MD (Fixed Twitter / X Downloader)

const axios = require('axios');

module.exports = {
    name: 'twitter',
    alias: ['tw', 'twdl', 'x'],
    category: 'downloader',
    description: 'Download Twitter (X) videos/photos in HD',
    usage: `${process.env.PREFIX || '.'}twitter <url>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = process.env.PREFIX || '.';
        let url = Array.isArray(args) ? args.join(' ').trim() : '';

        // Reply support for link extraction
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;

        if (!url && quoted) {
            const quotedText =
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                '';
            const match = quotedText.match(/https?:\/\/(?:www\.|x\.|twitter\.com)\/[^\s<>"']+/i);
            if (match) url = match[0].replace(/[)\]}>.,!?]+$/g, '');
        }

        if (!url || (!url.includes('twitter.com') && !url.includes('x.com'))) {
            return await sock.sendMessage(jid, { 
                text: `❌ *Invalid URL*\n\n➤ Example: ${prefix}twitter https://x.com/...` 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            // 1. MULTIPLE API LIST (JERRYCODER FIRST)
            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/twitter?url=${encodeURIComponent(url)}`,
                `https://kiraxmd-api.vercel.app/api/twitter?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(url)}`,
                `https://api.ryzendesu.vip/api/downloader/twdl?url=${encodeURIComponent(url)}`
            ];

            let resultData = null;

            for (const api of apis) {
                try {
                    const res = await axios.get(api, { timeout: 20000 });
                    if (res.data && (res.data.result || res.data.data)) {
                        resultData = res.data.result || res.data.data;
                        break;
                    }
                } catch (e) {
                    continue; // Next API
                }
            }

            if (!resultData) throw new Error("No data received from APIs");

            // 2. EXTRACT MEDIA URL (Handling 'medias' array & direct links)
            let mediaUrl = null;

            if (resultData?.medias && Array.isArray(resultData.medias) && resultData.medias.length > 0) {
                // Prioritize HD video from medias array
                const hdMedia = resultData.medias.find(m => m.url && m.url.includes('.mp4'));
                mediaUrl = hdMedia ? hdMedia.url : resultData.medias[0].url;
            } else {
                mediaUrl = resultData?.video_hd || resultData?.hd || resultData?.video_sd || resultData?.sd || resultData?.video || resultData?.url;
            }

            if (!mediaUrl) throw new Error("Could not extract media link.");

            // 3. EXTRACT CAPTION
            const tweetText = resultData?.title || resultData?.desc || resultData?.text || resultData?.description || resultData?.caption || "";

            // 4. DOWNLOAD MEDIA BUFFER
            const mediaBuffer = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            // 5. CHECK IF IT IS VIDEO OR IMAGE
            const isVideo = mediaUrl.includes('.mp4') || resultData?.video || resultData?.hd || (resultData?.medias && resultData.medias.some(m => m.videoAvailable));

            if (isVideo) {
                await sock.sendMessage(jid, {
                    video: mediaBuffer.data, 
                    caption: tweetText 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    image: mediaBuffer.data, 
                    caption: tweetText 
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