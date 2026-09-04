// plugins/play.js – KIRA X MD (Dynamic Metadata & Audio Downloader)
const ytSearch = require('yt-search');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { getSettings } = require('../lib/database');

const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

module.exports = {
    name: 'play',
    alias: ['song', 'yta', 'music', 'audio'],
    category: 'downloader',
    description: 'Search and play YouTube audio with dynamic metadata',
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
        let inputPath = null;
        let outputPath = null;

        try {
            console.log("\n========== PLAY CMD ==========");
            console.log("Query:", query);

            // Fetch Bot & Owner names dynamically
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
            const settings = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};
            const botName = settings.botName || process.env.BOT_NAME || global.config?.BOT_NAME || 'KIRA X MD';
            const ownerName = settings.ownerName || process.env.OWNER_NAME || global.config?.OWNER_NAME || 'Madhav';

            // ─────────────────────────────────────
            // 1. SEND SEARCHING MESSAGE
            // ─────────────────────────────────────
            statusMsg = await sock.sendMessage(jid, {
                text: `🔍 _*Searching*_ : \`${query}\``
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
                        author: { name: ownerName }
                    };
                }
            }

            // ─────────────────────────────────────
            // 2. SONG DETAILS & DOWNLOADING MSG
            // ─────────────────────────────────────
            const title = songInfo?.title || "Unknown Song";
            const artist = songInfo?.author?.name || ownerName;

            const downloadText = `⬇️ _*Downloading*_ : ${title} | ${artist}`;
            console.log(`Downloading: ${title} by ${artist}`);

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
            // DOWNLOAD AUDIO TO TEMP FILE
            // ─────────────────────────────────────
            console.log("Downloading audio stream...");

            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            inputPath = path.join(tempDir, `raw_audio_${Date.now()}.mp3`);
            outputPath = path.join(tempDir, `tagged_${Date.now()}.mp3`);

            const audioResponse = await axios({
                method: "GET",
                url: audioUrl,
                responseType: "stream",
                timeout: 60000,
                maxRedirects: 10,
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            const writer = fs.createWriteStream(inputPath);
            audioResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            // ─────────────────────────────────────
            // INJECT DYNAMIC METADATA VIA FFMPEG
            // ─────────────────────────────────────
            console.log("Injecting dynamic tags via FFmpeg...");

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat("mp3")
                    .audioBitrate(128)
                    .outputOptions([
                        '-metadata', `title=${title}`,
                        '-metadata', `artist=${ownerName}`,
                        '-metadata', `album=${botName}`
                    ])
                    .on("end", () => {
                        console.log("Metadata injection completed.");
                        resolve();
                    })
                    .on("error", (err) => {
                        console.warn("FFmpeg tagging failed, proceeding with raw audio:", err.message);
                        resolve(); // Graceful fallback
                    })
                    .save(outputPath);
            });

            const finalPath = fs.existsSync(outputPath) ? outputPath : inputPath;
            const finalBuffer = fs.readFileSync(finalPath);

            // ─────────────────────────────────────
            // SEND AUDIO TO WHATSAPP
            // ─────────────────────────────────────
            console.log("Sending audio to WhatsApp...");

            await sock.sendMessage(jid, {
                audio: finalBuffer,
                mimetype: "audio/mpeg",
                ptt: false,
                fileName: `${botName.replace(/\s+/g, '_')}_${Date.now()}.mp3`
            }, { quoted: msg });

            console.log("✅ Audio sent successfully.");

            // ─────────────────────────────────────
            // 3. EDIT MESSAGE TO DOWNLOADED
            // ─────────────────────────────────────
            const downloadedText = `✅ _*Downloaded*_ : ${title} | ${artist}`;
            if (statusMsg?.key) {
                try {
                    await sock.sendMessage(jid, { 
                        text: downloadedText,
                        edit: statusMsg.key 
                    });
                } catch {}
            }

        } catch (err) {
            console.error("\n========== PLAY ERROR ==========");
            console.error(err);

            const errorText = `❌ _*Download Failed*_ : \n\n⚠️ ${err.message || "An unexpected error occurred."}`;

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
        } finally {
            try {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
        }
    }
};
