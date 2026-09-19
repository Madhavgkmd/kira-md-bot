// plugins/fb.js – KIRA X MD (Fixed Facebook Downloader with HD Priority)

const axios = require("axios");

function decodeHTMLEntities(text) {
    if (!text) return "";
    return text
        .replace(/&#([xX]?)([0-9a-fA-F]+);?/g, (_, isHex, num) => String.fromCharCode(parseInt(num, isHex ? 16 : 10)))
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

module.exports = {
    name: "fb",
    alias: ["facebook", "fbdl"],
    category: "downloader",
    description: "Download Facebook videos in HD",
    usage: `${process.env.PREFIX || "."}fb <url>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = process.env.PREFIX || ".";
        let url = Array.isArray(args) ? args.join(" ").trim() : "";

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;

        if (!url && quoted) {
            const quotedText =
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                "";
            const match = quotedText.match(/https?:\/\/(?:www\.|m\.|mbasic\.)?(?:facebook\.com|fb\.watch|fb\.gg)\/[^\s<>"']+/i);
            if (match) url = match[0].replace(/[)\]}>.,!?]+$/g, "");
        }

        if (!url) {
            return await sock.sendMessage(jid, {
                text: `❌ Example:\n${prefix}fb https://fb.watch/xxxxx\n\nor reply to a Facebook link with ${prefix}fb`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            // 1. JERRYCODER API FIRST, THEN FALLBACKS
            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/fb?url=${encodeURIComponent(url)}`,
                `https://kiraxmd-api.vercel.app/api/fb?url=${encodeURIComponent(url)}`,
                `https://api-aswin-sparky.koyeb.app/api/downloader/fb?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`,
                `https://api.ryzendesu.vip/api/downloader/fbdl?url=${encodeURIComponent(url)}`
            ];

            let data = null;

            for (const api of apis) {
                try {
                    const res = await axios.get(api, { timeout: 25000 });
                    if (res.data) {
                        data = res.data;
                        break;
                    }
                } catch (e) {
                    continue; // Adutha API nokkum
                }
            }

            if (!data) throw new Error("All FB APIs failed");

            // 2. EXTRACT VIDEO URL (PRIORITIZING HD)
            let videoUrl = null;

            // Checking new API format (data.results array)
            if (data?.results && Array.isArray(data.results)) {
                // Priority 1: HD Quality
                const hdVideo = data.results.find(v => v.quality && (v.quality.includes('HD') || v.quality.includes('720p')) && v.url && v.url.startsWith('http'));
                
                if (hdVideo) {
                    videoUrl = hdVideo.url;
                } else {
                    // Priority 2: SD Quality (Avoiding audio/kbps formats)
                    const sdVideo = data.results.find(v => v.quality && !v.quality.includes('kbps') && v.url && v.url.startsWith('http'));
                    if (sdVideo) {
                        videoUrl = sdVideo.url;
                    }
                }
            }

            // Fallback for other APIs if the first one failed
            if (!videoUrl) {
                const potentialVideos = [
                    data?.result?.hd, data?.result?.video, data?.result?.sd, data?.result?.url,
                    data?.data?.hd, data?.data?.video, data?.data?.sd, data?.data?.url,
                    data?.hd, data?.video, data?.url
                ];

                for (const v of potentialVideos) {
                    if (typeof v === 'string' && v.startsWith('http')) {
                        videoUrl = v;
                        break;
                    }
                }
            }

            if (!videoUrl) throw new Error("No valid video string found");

            // 3. EXTRACT TITLE
            const rawTitle = data?.title || data?.result?.title || data?.result?.desc || data?.data?.title || data?.data?.desc || "";
            const title = decodeHTMLEntities(rawTitle);

            // 4. SEND VIDEO
            await sock.sendMessage(jid, {
                video: { url: videoUrl },
                caption: title 
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.log("FB ERROR:", err.message);

            await sock.sendMessage(jid, {
                text: "❌ Something error please try again later ⚠️"
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};