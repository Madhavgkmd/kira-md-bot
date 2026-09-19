// plugins/play.js – KIRA X MD (Ultra Fast Audio Downloader with ID3 Tags & API Fallback)
const ytSearch = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { getSettings } = require('../lib/database');

// FFmpeg Path Setup
const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

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

            // 1. SEND SEARCHING MESSAGE
            statusMsg = await sock.sendMessage(jid, {
                text: `*Searching* : \`${query}\``
            }, { quoted: msg });

            let url = null;
            let youtubeId = null;
            let songInfo = null;

            // EXTRACT YOUTUBE ID
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

            // SEARCH YOUTUBE
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

            // 2. SONG DETAILS & DOWNLOADING MSG
            if (statusMsg?.key) {
                await sock.sendMessage(jid, { 
                    text: `*Downloading* : ${title} | ${artist}`,
                    edit: statusMsg.key 
                });
            }

            // 🔥 API LIST: Xenoytdl & Kira APIs First, followed by fallbacks
            const apis = [
                `https://xenoytdl-2.vercel.app/api/youtube?url=${encodeURIComponent(url)}`,
                `https://kiraxmd-api.vercel.app/api/play?query=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/download/ytmp3?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`
            ];

            let finalBuffer = null;

            // FALLBACK API LOOP
            for (const api of apis) {
                try {
                    const res = await axios.get(api, {
                        timeout: 12000,
                        headers: { "User-Agent": "Mozilla/5.0" }
                    });
                    const data = res.data;

                    const candidate =
                        data?.result?.mp3 ||
                        data?.result?.url ||
                        data?.data?.dl ||
                        data?.data?.download ||
                        data?.download ||
                        data?.url ||
                        data?.result?.download_url ||
                        data?.result?.audio ||
                        (typeof data?.result === "string" ? data.result : null);

                    if (candidate && typeof candidate === "string" && candidate.startsWith("http")) {
                        const audioResponse = await axios.get(candidate, {
                            responseType: "arraybuffer",
                            timeout: 20000,
                            headers: { "User-Agent": "Mozilla/5.0" }
                        });
                        
                        if (audioResponse.status === 200 && audioResponse.data) {
                            finalBuffer = Buffer.from(audioResponse.data);
                            break; // Success! Exit loop.
                        }
                    }
                } catch (err) {
                    continue; // If this API fails, automatically try the next one!
                }
            }

            if (!finalBuffer) {
                throw new Error("All servers are busy. Could not fetch the audio track.");
            }

            // ─────────────────────────────────────
            // FFMPEG METADATA TAGGING (WITH SAFE FALLBACK)
            // ─────────────────────────────────────
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const inputPath = path.join(tempDir, `play_in_${Date.now()}.mp3`);
            const outputPath = path.join(tempDir, `play_out_${Date.now()}.mp3`);
            let sendBuffer = finalBuffer; // Default to untagged buffer

            try {
                fs.writeFileSync(inputPath, finalBuffer);

                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .audioBitrate(128)
                        .outputOptions([
                            '-metadata', `title=${title}`, 
                            '-metadata', `artist=${artist}`,    
                            '-metadata', `album=${botName}`
                        ])
                        .on("end", () => {
                            if (fs.existsSync(outputPath)) {
                                sendBuffer = fs.readFileSync(outputPath); // Update to tagged buffer
                            }
                            resolve();
                        })
                        .on("error", (err) => {
                            console.error("FFmpeg Tagging Failed (Skipping Tags):", err.message);
                            resolve(); // Resolve anyway so it doesn't crash!
                        })
                        .save(outputPath);
                });
            } catch (ffmpegErr) {
                console.error("FFmpeg Process Error:", ffmpegErr.message);
            } finally {
                // Cleanup Temp Files
                try {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (e) {}
            }

            // ─────────────────────────────────────
            // SEND AUDIO TO WHATSAPP
            // ─────────────────────────────────────
            await sock.sendMessage(jid, {
                audio: sendBuffer,
                mimetype: "audio/mpeg",
                ptt: false,
                fileName: `${title.replace(/[^a-zA-Z0-9 ]/g, '')}.mp3`
            }, { quoted: msg });

            // 3. EDIT STATUS TO DOWNLOADED
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