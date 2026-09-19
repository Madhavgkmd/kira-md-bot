const axios = require("axios");

module.exports = {
    name: "ytv",
    alias: ["yt", "video", "ytmp4" , "youtube"],
    category: "downloader",
    description: "Download YouTube video (MP4)",
    usage: `${process.env.PREFIX || '.'}ytv <url> (or reply to a YouTube link)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;

        // ─── Get URL from args or reply ───
        let url = args.join(" ").trim();

        if (!url) {
            // Check if replying to a message
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                const quotedText =
                    quoted.conversation ||
                    quoted.extendedTextMessage?.text ||
                    quoted.imageMessage?.caption ||
                    quoted.videoMessage?.caption ||
                    "";
                const match = quotedText.match(/https?:\/\/[^\s]+/);
                if (match) url = match[0];
            }
        }

        if (!url || !url.includes("youtu")) {
            return sock.sendMessage(jid, {
                text: `❌ *Missing YouTube URL*\n\n➤ ${process.env.PREFIX || '.'}ytv <url>\n➤ Or reply to a message containing a YouTube link.`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, {
                react: { text: "⏳", key: msg.key }
            });

            // ─── APIs (NEW API ADDED FIRST) ───
            const apis = [
                `https://api-aswin-sparky.koyeb.app/api/downloader/ytv?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp4-v1?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytmp4?url=${encodeURIComponent(url)}`
            ];

            let video = null;
            let title = "YouTube Video";

            for (const api of apis) {
                try {
                    const { data } = await axios.get(api, { timeout: 15000 });
                    
                    video =
                        data?.data?.url ||
                        data?.data?.dl ||
                        data?.result?.url ||
                        data?.result?.video ||
                        data?.url ||
                        data?.download;

                    title =
                        data?.data?.title ||
                        data?.result?.title ||
                        data?.title ||
                        title;

                    if (video) break;
                } catch (e) {
                    console.log("API failed:", api);
                }
            }

            if (!video) throw new Error("No video URL found");

            await sock.sendMessage(jid, {
                video: { url: video },
                caption: `${title}` // 🔥 Watermark removed, only Original Title
            }, { quoted: msg });

            await sock.sendMessage(jid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (err) {
            console.error("YTV error:", err);
            
            // 🔥 CUSTOM ERROR MESSAGE LIKE INSTA
            await sock.sendMessage(jid, {
                text: `❌ *Something error please try again later*`
            }, { quoted: msg });
            
            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });
        }
    }
};