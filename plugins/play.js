// plugins/play.js – KIRA X MD
const ytSearch = require('yt-search');
const axios = require('axios');

module.exports = {
    name: 'play',
    alias: ['song', 'music', 'audio'],
    category: 'downloader',
    description: 'Search and play YouTube audio or use direct link',
    usage: `${process.env.PREFIX || '.'}play <song name or link>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(jid, {
                text: `❌ *Please provide a song name or YouTube link.*`
            }, { quoted: msg });
        }

        let statusMsg = null;

        try {
            console.log("\n========== PLAY CMD ==========");
            console.log("Query:", query);

            // ─────────────────────────────────────
            // SEND SEARCHING MESSAGE ONCE
            // ─────────────────────────────────────
            statusMsg = await sock.sendMessage(jid, {
                text: `🔍 *Searching :* \`${query}\``
            }, { quoted: msg });

            let url = null;
            let youtubeId = null;
            let songInfo = null;

            // ─────────────────────────────────────
            // EXTRACT YOUTUBE ID
            // ─────────────────────────────────────
            const shortMatch = query.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
            if (shortMatch) {
                youtubeId = shortMatch[1];
                url = `https://youtu.be/${youtubeId}`;
            }

            if (!youtubeId) {
                const watchMatch = query.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
                if (watchMatch) {
                    youtubeId = watchMatch[1];
                    url = `https://www.youtube.com/watch?v=${youtubeId}`;
                }
            }

            // ─────────────────────────────────────
            // SEARCH YOUTUBE
            // ─────────────────────────────────────
            if (!youtubeId) {
                console.log("Searching for:", query);
                const search = await ytSearch(query);

                if (!search?.videos?.length) {
                    throw new Error("No results found on YouTube.");
                }

                songInfo = search.videos[0];
                url = songInfo.url;
                console.log("Selected:", songInfo.title);
            } else {
                console.log("YouTube URL:", url);
                try {
                    const info = await ytSearch({ videoId: youtubeId });
                    if (info) songInfo = info;
                } catch {}

                if (!songInfo) {
                    songInfo = {
                        title: query,
                        author: { name: "YouTube" }
                    };
                }
            }

            // ─────────────────────────────────────
            // SONG DETAILS (CLEAN & AESTHETIC)
            // ─────────────────────────────────────
            const title = songInfo?.title || "Unknown Song";
            const artist = songInfo?.author?.name || "Unknown Artist";

            // Formatting the clean UI string as requested
            const downloadText = `⬇️ *Downloading :* ${title} | ${artist}`;

            console.log(`Downloading: ${title} by ${artist}`);

            // ─────────────────────────────────────
            // EDIT SAME MESSAGE TO SHOW DOWNLOADING
            // ─────────────────────────────────────
            if (statusMsg?.key) {
                await sock.sendMessage(jid, { 
                    text: downloadText,
                    edit: statusMsg.key 
                });
            }

            // ─────────────────────────────────────
            // API LIST
            // ─────────────────────────────────────
            const apis = [
                `https://kiraxmd-api.vercel.app/api/play?query=${encodeURIComponent(url)}`,
                `https://xenoytdl-2.vercel.app/api/youtube?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}`
            ];

            let audioUrl = null;

            // ─────────────────────────────────────
            // TRY APIs
            // ─────────────────────────────────────
            for (const api of apis) {
                try {
                    console.log("Trying API:", api);
                    const res = await axios.get(api, {
                        timeout: 40000,
                        validateStatus: () => true
                    });
                    const data = res.data;

                    const candidate =
                        data?.result?.mp3 ||
                        data?.data?.dl ||
                        data?.data?.download ||
                        data?.download ||
                        data?.url ||
                        data?.result?.download_url ||
                        data?.result?.audio ||
                        data?.result?.url ||
                        (typeof data?.result === "string" ? data.result : null);

                    if (!candidate || typeof candidate !== "string" || !candidate.startsWith("http")) {
                        continue;
                    }

                    // Test audio URL stream
                    try {
                        const test = await axios.get(candidate, {
                            responseType: "stream",
                            timeout: 15000,
                            maxRedirects: 10,
                            validateStatus: () => true,
                            headers: { "User-Agent": "Mozilla/5.0" }
                        });

                        if (test.status === 200 || test.status === 206) {
                            audioUrl = candidate;
                            console.log("✅ Working URL Found:", audioUrl);
                            try { test.data.destroy(); } catch {}
                            break;
                        }
                        try { test.data.destroy(); } catch {}
                    } catch (err) {
                        console.log("URL Test Failed:", err.message);
                    }
                } catch (err) {
                    console.log("API Failed:", err.message);
                }
            }

            if (!audioUrl) {
                throw new Error("Could not extract audio URL right now. Please try again later.");
            }

            // ─────────────────────────────────────
            // DOWNLOAD AUDIO
            // ─────────────────────────────────────
            console.log("Downloading audio buffer...");

            const audioResponse = await axios.get(audioUrl, {
                responseType: "arraybuffer",
                timeout: 60000,
                maxRedirects: 10,
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            const audioBuffer = Buffer.from(audioResponse.data);

            // ─────────────────────────────────────
            // SEND AUDIO
            // ─────────────────────────────────────
            console.log("Sending audio to WhatsApp...");

            await sock.sendMessage(jid, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                ptt: false
            }, { quoted: msg });

            console.log("✅ Audio sent successfully.");

        } catch (err) {
            console.error("\n========== PLAY ERROR ==========");
            console.error(err);

            const errorText = `❌ *Download Failed*\n\n⚠️ ${err.message || "An unexpected error occurred."}`;

            // Edit the SAME message to show error
            if (statusMsg?.key) {
                try {
                    await sock.sendMessage(jid, {
                        text: errorText,
                        edit: statusMsg.key 
                    });
                    return;
                } catch {}
            }

            // Fallback if edit fails
            try {
                await sock.sendMessage(jid, { text: errorText }, { quoted: msg });
            } catch {}
        }
    }
};