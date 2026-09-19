// plugins/tiktok.js - KIRA X MD (Fixed Video URL & Error Message)

const axios = require("axios");

module.exports = {
    name: "tiktok",
    alias: ["tt", "ttdl"],
    category: "downloader",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args || []).join(" ").trim();

        // Reply support
        const context =
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
            msg.message?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo;

        const quoted = context?.quotedMessage;

        if (!url && quoted) {
            const text =
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                quoted.documentMessage?.caption ||
                "";

            const match = text.match(/https?:\/\/[^\s]+/i);
            if (match) {
                url = match[0];
            }
        }

        if (!url || !url.startsWith("http")) {
            return sock.sendMessage(jid, {
                text: "❌ Example:\n.tt https://vt.tiktok.com/xxxxx\n\nor reply to a TikTok link with .tt"
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            const apis = [
                `https://kiraxmd-api.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`,
                `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/tiktok?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/tiktok-v1?url=${encodeURIComponent(url)}`
            ];

            let data = null;

            for (const api of apis) {
                try {
                    const res = await axios.get(api, { timeout: 20000 });
                    if (res.data) {
                        data = res.data;
                        break;
                    }
                } catch (e) {
                    continue; // Adutha API nokkum
                }
            }

            if (!data) throw new Error("All APIs failed");

            // Extract Original Caption
            const postCaption =
                data?.result?.title ||
                data?.result?.caption ||
                data?.result?.desc ||
                data?.data?.title ||
                data?.data?.caption ||
                data?.data?.desc ||
                data?.title ||
                data?.caption ||
                "";

            // ⚠️ FIX: Check if it's a valid string starting with 'http'
            let video = null;
            const potentialLinks = [
                data?.result?.no_watermark,
                data?.result?.nowm,
                data?.data?.no_watermark,
                data?.data?.nowm,
                data?.data?.play,
                data?.result?.video,
                data?.result?.download,
                data?.result?.url,
                data?.data?.video,
                data?.data?.download,
                data?.data?.url,
                data?.video,
                data?.url
            ];

            for (const link of potentialLinks) {
                if (typeof link === 'string' && link.startsWith('http')) {
                    video = link;
                    break; 
                }
            }

            if (!video) throw new Error("No valid video string found");

            // Send Video
            await sock.sendMessage(jid, {
                video: { url: video },
                caption: postCaption
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.log("TIKTOK ERROR:", e.message);

            // ⚠️ FIX: Short custom error message as you requested
            await sock.sendMessage(jid, {
                text: "❌ Something error please try again later ⚠️"
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};