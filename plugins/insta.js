const axios = require("axios");

module.exports = {
    name: "insta",
    alias: ["ig", "story","instagram"],
    category: "downloader",
    description: "Instagram Downloader",

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
                { text: "❌ Example: .insta <insta link>" },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, {
                react: { text: "⏳", key: msg.key }
            });

            // ─── API list (Ninte API aadyam add cheythu) ───
            const apis = [
                `https://kiraxmd-api.vercel.app/api/insta?url=${encodeURIComponent(url)}`, // First Priority
                `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/insta-v2?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/insta-v1?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/insta?url=${encodeURIComponent(url)}`
            ];

            let data = null;

            for (const api of apis) {
                try {
                    const res = await axios.get(api, {
                        timeout: 40000 // Vercel cold start delay handle cheyyan timeout kooti
                    });

                    const d = res.data;

                    console.log("INSTA API:", api);

                    const hasMedia =
                        (Array.isArray(d?.data) && d.data.length > 0) ||
                        (Array.isArray(d?.result) && d.result.length > 0) ||
                        d?.url ||
                        d?.video ||
                        d?.data?.url;

                    if (hasMedia) {
                        data = d;
                        console.log("✅ INSTA API SUCCESS:", api);
                        break;
                    }
                } catch (e) {
                    console.log("❌ INSTA API FAILED:", api);
                }
            }

            if (!data) {
                throw new Error("All Instagram APIs failed");
            }

            // Extract Original Caption ONLY
            const postCaption =
                data?.caption ||
                data?.result?.caption ||
                data?.data?.caption ||
                "";

            let items = [];

            if (Array.isArray(data?.data)) {
                items = data.data;
            } else if (Array.isArray(data?.result)) {
                items = data.result; 
            } else if (data?.url || data?.video) {
                items = [
                    {
                        type: "video",
                        url: data.url || data.video
                    }
                ];
            }

            if (!items.length) {
                throw new Error("No media found");
            }

            for (const item of items) {
                const media = item.url || item.video || item.download;

                if (!media) continue;

                const type =
                    item.type ||
                    (media.includes(".mp4") ? "video" : "image");

                // Use only the raw caption, fallback to empty string if none exists
                const finalCaption = postCaption ? postCaption : "";

                try {
                    // 🚀 BUFFER FIX: Direct URL-nu pakaram media download cheythu Buffer aakkunnu
                    const mediaRes = await axios.get(media, {
                        responseType: 'arraybuffer',
                        headers: { "User-Agent": "Mozilla/5.0" }
                    });
                    const mediaBuffer = Buffer.from(mediaRes.data, 'utf-8');

                    if (type.toLowerCase() === "image" || type.toLowerCase() === "photo") {
                        await sock.sendMessage(
                            jid,
                            {
                                image: mediaBuffer,
                                caption: finalCaption
                            },
                            { quoted: msg }
                        );
                    } else {
                        await sock.sendMessage(
                            jid,
                            {
                                video: mediaBuffer,
                                mimetype: 'video/mp4', // Correct mimetype set aakkunnu
                                caption: finalCaption
                            },
                            { quoted: msg }
                        );
                    }
                } catch (bufferError) {
                    console.log("Buffer download failed, falling back to direct URL.");
                    // In case buffer fails, fallback to old direct URL method
                    if (type.toLowerCase() === "image" || type.toLowerCase() === "photo") {
                        await sock.sendMessage(jid, { image: { url: media }, caption: finalCaption }, { quoted: msg });
                    } else {
                        await sock.sendMessage(jid, { video: { url: media }, caption: finalCaption }, { quoted: msg });
                    }
                }
            }

            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (err) {
            console.log("INSTA ERROR:", err);

            await sock.sendMessage(
                jid,
                { text: "❌ Download Failed" },
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