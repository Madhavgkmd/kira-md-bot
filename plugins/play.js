// plugins/play.js – KIRA X MD (YouTube audio downloader – Power Version)
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
                text: `❌ *Give a song name or YouTube link*`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
            console.log("\n========== PLAY CMD ==========");
            console.log("Query:", query);

            let url = null;
            let youtubeId = null;

            // ─── Extract YouTube ID ───
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

            // If no direct link, search with yt-search
            if (!youtubeId) {
                console.log("Searching for:", query);
                const search = await ytSearch(query);
                if (!search?.videos?.length) throw new Error("No results found");
                url = search.videos[0].url;
                console.log("Selected:", search.videos[0].title);
            } else {
                console.log("YouTube URL:", url);
            }

            await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

            // ─── API list (YOUR API IS FIRST) ───
            const apis = [
                // 1️⃣ Your KiraxMD API (audio only)
                `https://kiraxmd-api.vercel.app/api/play?query=${encodeURIComponent(url)}`,
                // 2️⃣ Fallback APIs
                `https://xenoytdl-2.vercel.app/api/youtube?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}`
            ];

            let audioUrl = null;

            for (const api of apis) {
                try {
                    console.log("Trying API:", api);
                    const res = await axios.get(api, {
                        timeout: 40000, // <--- CHANGED FROM 15000 TO 40000 (40 Seconds limit so your API doesn't fail early)
                        validateStatus: () => true
                    });
                    const data = res.data;
                    console.log("API RESPONSE:", JSON.stringify(data, null, 2));

                    // Candidate extraction – handles YOUR response format exactly
                    let candidate =
                        data?.result?.mp3 ||        // <-- Your API returns { result: { mp3: "..." } }
                        data?.data?.dl ||
                        data?.data?.download ||
                        data?.download ||
                        data?.url ||
                        data?.result?.download_url ||
                        data?.result?.audio ||
                        data?.result?.url ||
                        (typeof data?.result === "string" ? data.result : null);

                    console.log("Candidate URL:", candidate);

                    if (!candidate || typeof candidate !== "string" || !candidate.startsWith("http")) {
                        console.log("No valid URL found, trying next API...");
                        continue;
                    }

                    // Test if the audio URL is accessible
                    try {
                        const test = await axios.get(candidate, {
                            responseType: "stream",
                            timeout: 15000, 
                            maxRedirects: 10,
                            validateStatus: () => true,
                            headers: { "User-Agent": "Mozilla/5.0" }
                        });
                        console.log("URL Status:", test.status);
                        
                        // 200 OK allengil 206 Partial Content aanenkil success aanu!
                        if (test.status === 200 || test.status === 206) {
                            audioUrl = candidate;
                            console.log("✅ Working URL Found:", audioUrl);
                            break;
                        } else {
                            console.log(`URL returned status ${test.status}, skipping...`);
                        }
                    } catch (err) {
                        console.log("URL Test Failed:", err.message);
                    }
                } catch (err) {
                    console.log("API Failed:", err.message);
                }
            }

            if (!audioUrl) {
                throw new Error("No valid audio URL found from any API");
            }

            console.log("Downloading audio...");
            const audioBuffer = await axios.get(audioUrl, {
                responseType: "arraybuffer",
                timeout: 60000, // <--- CHANGED FROM 30000 TO 60000 (To allow slow downloads to finish)
                maxRedirects: 10,
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            console.log("Sending audio...");
            await sock.sendMessage(jid, {
                audio: Buffer.from(audioBuffer.data),
                mimetype: "audio/mpeg",
                ptt: false
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

        } catch (err) {
            console.error("\n========== PLAY ERROR ==========");
            console.error(err);
            await sock.sendMessage(jid, {
                text: `❌ *Play failed*\n\n${err.message}`
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};