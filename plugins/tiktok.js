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
            return sock.sendMessage(
                jid,
                {
                    text: "❌ Example:\n.tt https://vt.tiktok.com/xxxxx\n\nor reply to a TikTok link with .tt"
                },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, {
                react: {
                    text: "⏳",
                    key: msg.key
                }
            });

            // 1. ADDED YOUR VERCEL API FIRST, THEN FALLBACKS
            const apis = [
                `https://kiraxmd-api.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`,
                `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/tiktok?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/tiktok-v1?url=${encodeURIComponent(url)}`
            ];

            let data = null;

            for (const api of apis) {
                try {
                    const res = await axios.get(api, {
                        timeout: 20000
                    });

                    if (res.data) {
                        data = res.data;
                        console.log("✅ TIKTOK API SUCCESS:", api);
                        break;
                    }
                } catch (e) {
                    console.log("❌ TIKTOK API FAILED:", api);
                }
            }

            if (!data) {
                throw new Error("All APIs failed to fetch the TikTok video.");
            }

            console.log("TIKTOK RESPONSE:", JSON.stringify(data).substring(0, 200) + "...");

            // 2. EXTRACT ORIGINAL CAPTION ONLY
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

            // 3. PRIORITIZE "NO WATERMARK" VIDEO LINKS
            const video =
                data?.result?.no_watermark ||
                data?.result?.nowm ||
                data?.data?.no_watermark ||
                data?.data?.nowm ||
                data?.data?.play ||
                data?.result?.video ||
                data?.result?.download ||
                data?.result?.url ||
                data?.data?.video ||
                data?.data?.download ||
                data?.data?.url ||
                data?.video ||
                data?.url;

            if (!video) {
                throw new Error("No video found in the API response.");
            }

            // 4. SENDING THE VIDEO WITH JUST THE CAPTION
            await sock.sendMessage(
                jid,
                {
                    video: { url: video },
                    caption: postCaption // FB pole original caption mathram
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (e) {
            console.log("TIKTOK ERROR:", e);

            await sock.sendMessage(
                jid,
                {
                    text: `❌ Download Failed\n\n⚠️ ${e.message || "Unknown Error"}`
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });
        }
    }
};