// plugins/fb.js – KIRA X MD Facebook Video Downloader

const axios = require("axios");

// 🔥 Helper function to decode HTML entities (fixes the alien text issue)
function decodeHTMLEntities(text) {
    if (!text) return "Facebook Video";
    return text
        .replace(/&#([xX]?)([0-9a-fA-F]+);?/g, (_, isHex, num) => String.fromCharCode(parseInt(num, isHex ? 16 : 10)))
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

module.exports = {
    name: "fb",
    alias: ["facebook"],
    category: "downloader",
    description: "Download Facebook videos using KIRA X MD API",
    usage: `${process.env.PREFIX || "."}fb <url>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = process.env.PREFIX || ".";

        // =========================================================
        // 1. GET URL FROM COMMAND
        // =========================================================

        let url = Array.isArray(args)
            ? args.join(" ").trim()
            : "";

        // =========================================================
        // 2. GET URL FROM QUOTED MESSAGE
        // =========================================================

        if (!url) {
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quoted = contextInfo?.quotedMessage;

            if (quoted) {
                const quotedText =
                    quoted.conversation ||
                    quoted.extendedTextMessage?.text ||
                    quoted.imageMessage?.caption ||
                    quoted.videoMessage?.caption ||
                    "";

                const match = quotedText.match(
                    /https?:\/\/(?:www\.|m\.|mbasic\.)?(?:facebook\.com|fb\.watch)\/[^\s<>"']+/i
                );

                if (match) {
                    url = match[0].replace(/[)\]}>.,!?]+$/g, "");
                }
            }
        }

        // =========================================================
        // 3. URL NOT FOUND
        // =========================================================

        if (!url) {
            return await sock.sendMessage(
                jid,
                {
                    text:
                        `❌ *Missing Facebook URL*\n\n` +
                        `➤ ${prefix}fb <facebook link>\n\n` +
                        `💡 You can also reply to a Facebook link with *${prefix}fb*`
                },
                { quoted: msg }
            );
        }

        try {
            // =====================================================
            // 4. START
            // =====================================================

            await sock.sendMessage(jid, {
                react: {
                    text: "⏳",
                    key: msg.key
                }
            });

            console.log("\n========== FB COMMAND ==========");
            console.log("Facebook URL:", url);

            // =====================================================
            // 5. CALL YOUR VERCEL API
            // =====================================================

            const apiUrl = `https://kiraxmd-api.vercel.app/api/fb?url=${encodeURIComponent(url)}`;

            console.log("Calling API:", apiUrl);

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
                }
            });

            const data = response.data;

            console.log("FB API status:", data?.status);

            // =====================================================
            // 6. CHECK API RESPONSE
            // =====================================================

            if (
                !data ||
                !data.status ||
                !data.result?.video
            ) {
                throw new Error(
                    data?.error ||
                    "Facebook API did not return a video URL."
                );
            }

            // =====================================================
            // 7. GET BEST QUALITY & DECODE CAPTION
            // =====================================================

            const videoUrl =
                data.result.hd ||
                data.result.video ||
                data.result.sd;

            if (!videoUrl) {
                throw new Error(
                    "No downloadable Facebook video URL found."
                );
            }

            // 🔥 Decoding the title here!
            const title = decodeHTMLEntities(data.result.title);

            console.log("✅ Video URL found");

            // =====================================================
            // 8. DOWNLOADING / SENDING
            // =====================================================

            await sock.sendMessage(jid, {
                react: {
                    text: "📥",
                    key: msg.key
                }
            });

            await sock.sendMessage(
                jid,
                {
                    video: {
                        url: videoUrl
                    },
                    mimetype: "video/mp4",
                    caption: title // Clean, readable text
                },
                { quoted: msg }
            );

            // =====================================================
            // 9. SUCCESS
            // =====================================================

            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

            console.log("✅ Facebook video sent successfully");

        } catch (err) {
            console.error("\n========== FB ERROR ==========");
            console.error(err);

            await sock.sendMessage(jid, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });

            await sock.sendMessage(
                jid,
                {
                    text:
                        `❌ *Facebook Download Failed!*\n\n` +
                        `⚠️ ${err.message || "Unknown error"}`
                },
                { quoted: msg }
            );
        }
    }
};