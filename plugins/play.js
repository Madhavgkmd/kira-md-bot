// plugins/play.js – KIRA X MD (Ultra Fast Audio Downloader)
const ytSearch = require('yt-search');
const axios = require('axios');
const { getSettings } = require('../lib/database');

module.exports = {
    name: 'play',
    alias: ['song', 'yta', 'music', 'audio'],
    category: 'downloader',
    description: 'Search and play YouTube audio with high speed',
    usage: `${process.env.PREFIX || '.'}play <song name or link>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(jid, {
                text: `*Please provide a song name or YouTube link.*`
            }, { quoted: msg });
        }

        let statusMsg = null;

        try {
            // Fetch Bot & Owner names dynamically
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
            const settings = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};
            const botName = settings.botName || process.env.BOT_NAME || global.config?.BOT_NAME || 'KIRA X MD';
            const ownerName = settings.ownerName || process.env.OWNER_NAME || global.config?.OWNER_NAME || 'Madhav';

            // ─────────────────────────────────────
            // 1. SEND SEARCHING MESSAGE
            // ─────────────────────────────────────
            statusMsg = await sock.sendMessage(jid, {
                text: `*Searching* : \`${query}\``
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
                const search = await ytSearch(query);
                if (!search?.videos?.length) {
                    throw new Error("No results found on YouTube.");
                }
                songInfo = search.videos[0];
                url = songInfo.url;
            } else {
                try {
                    const info = await ytSearch({ videoId: youtubeId });
                    if (info) songInfo = info;
                } catch {}

                if (!songInfo) {
                    songInfo = {
                        title: query,
                        author: { name: ownerName }
                    };
                }
            }

            const title = songInfo?.title || "Unknown Song";
            const artist = songInfo?.author?.name || ownerName;

            // ─────────────────────────────────────
            // 2. SONG DETAILS & DOWNLOADING MSG
            // ─────────────────────────────────────
            if (statusMsg?.key) {
                await sock.sendMessage(jid, { 
                    text: `*Downloading* : ${title} | ${artist}`,
                    edit: statusMsg.key 
                });
            }

            // ─────────────────────────────────────
            // API LIST (XENO FIRST, KIRA FALLBACK)
            // ─────────────────────────────────────
            const apis = [
                `https://xenoytdl-2.vercel.app/api/youtube?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://kiraxmd-api.vercel.app/api/play?query=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}`
            ];

            let audioUrl = null;

            // ─────────────────────────────────────
            // FAST API EXTRACTION
            // ─────────────────────────────────────
            for (const api of apis) {
                try {
                    const res = await axios.get(api, {
                        timeout: 10000,
                        headers: { "User-Agent": "Mozilla/5.0" }
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

                    if (candidate && typeof candidate === "string" && candidate.startsWith("http")) {
                        audioUrl = candidate;
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }

            if (!audioUrl) {
                throw new Error("Could not fetch download stream. Please try again.");
            }

            // ─────────────────────────────────────
            // DIRECT BUFFER DOWNLOAD (NO DISK WRITE / NO SLOW FFMPEG)
            // ─────────────────────────────────────
            const audioResponse = await axios.get(audioUrl, {
                responseType: "arraybuffer",
                timeout: 30000,
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            const finalBuffer = Buffer.from(audioResponse.data);

            // ─────────────────────────────────────
            // SEND AUDIO TO WHATSAPP
            // ─────────────────────────────────────
            await sock.sendMessage(jid, {
                audio: finalBuffer,
                mimetype: "audio/mpeg",
                ptt: false,
                fileName: `${title.replace(/[^a-zA-Z0-9 ]/g, '')}.mp3`
            }, { quoted: msg });

            // ─────────────────────────────────────
            // 3. EDIT STATUS TO DOWNLOADED
            // ─────────────────────────────────────
            if (statusMsg?.key) {
                try {
                    await sock.sendMessage(jid, { 
                        text: `*Downloaded* : ${title} | ${artist}`,
                        edit: statusMsg.key 
                    });
                } catch {}
            }

        } catch (err) {
            console.error("PLAY ERROR:", err.message);
            const errorText = `*Download Failed* : \n\n${err.message || "An unexpected error occurred."}`;

            if (statusMsg?.key) {
                try {
                    await sock.sendMessage(jid, {
                        text: errorText,
                        edit: statusMsg.key 
                    });
                    return;
                } catch {}
            }

            try {
                await sock.sendMessage(jid, { text: errorText }, { quoted: msg });
            } catch {}
        }
    }
};

