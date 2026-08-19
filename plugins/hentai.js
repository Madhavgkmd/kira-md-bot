// plugins/hentai.js – KIRA X MD (NSFW Video Downloader – Never Fails)
const axios = require('axios');

const WATERMARK = `\n\n──────────────\n> *${global.config?.BOT_NAME || 'KIRA X MD'}*`;
// ─── HARDCODED FALLBACK (from your JSON) ──────────────
const FALLBACK_VIDEOS = [
    {
        title: "Sakura Kasugano reverse cowgirl ride",
        pageUrl: "https://sfmcompile.club/sakura-kasugano-reverse-cowgirl-ride/",
        category: "Street Fighter",
        share_count: 4,
        views_count: 612,
        mp4: "https://sfmcompile.club/wp-content/uploads/2026/01/Sakura-Kasugano-reverse-cowgirl-ride.mp4"
    },
    {
        title: "Mizora can’t get enough of that cock",
        pageUrl: "https://sfmcompile.club/mizora-cant-get-enough-of-that-cock/",
        category: "Baldur's Gate",
        share_count: 6,
        views_count: 39,
        mp4: "https://sfmcompile.club/wp-content/uploads/2026/01/Mizora-cant-get-enough-of-that-cock.mp4"
    },
    {
        title: "Mira anal riding her pet pov",
        pageUrl: "https://sfmcompile.club/mira-anal-riding-her-pet-pov/",
        category: "KPop Demon Hunters",
        share_count: 5,
        views_count: 276,
        mp4: "https://sfmcompile.club/wp-content/uploads/2026/01/Mira-anal-riding-her-pet-pov.mp4"
    },
    {
        title: "Raven fucked hard in the elevator",
        pageUrl: "https://sfmcompile.club/raven-fucked-hard-in-the-elevator/",
        category: "DC Comics, Raven",
        share_count: 5,
        views_count: 82,
        mp4: "https://sfmcompile.club/wp-content/uploads/2026/01/Raven-fucked-hard-in-the-elevator.mp4"
    },
    {
        title: "Phoenix and Magik giving a fellatio pov",
        pageUrl: "https://sfmcompile.club/phoenix-and-magik-giving-a-fellatio-pov/",
        category: "Marvel",
        share_count: 6,
        views_count: 24,
        mp4: "https://sfmcompile.club/wp-content/uploads/2026/01/Phoenix-and-MAgik-giving-a-fellatio-pov.mp4"
    },
    {
        title: "What Karlach do everynight in the camp",
        pageUrl: "https://sfmcompile.club/what-karlach-do-everynight-in-the-camp/",
        category: "Baldur's Gate",
        share_count: 6,
        views_count: 28,
        mp4: "https://sfmcompile.club/wp-content/uploads/2026/01/What-Karlach-do-everynight-in-the-camp.mp4"
    },
    {
        title: "Trigger spreading for anal access",
        pageUrl: "https://sfmcompile.club/trigger-spreading-for-anal-access/",
        category: "Zenless Zone Zero",
        share_count: 4,
        views_count: 22,
        mp4: "https://sfmcompile.club/wp-content/uploads/2026/01/Trigger-spreading-for-anal-access.mp4"
    },
    {
        title: "Jill Valentine can’t focus on sniping",
        pageUrl: "https://sfmcompile.club/jill-valentine-cant-focus-on-sniping/",
        category: "Jill Valentine, Resident Evil",
        share_count: 5,
        views_count: 39,
        mp4: "https://sfmcompile.club/wp-content/uploads/2026/01/Jill-Valentine-cant-focus-on-sniping.mp4"
    }
];

const listCache = {};

module.exports = {
    name: 'hentai',
    alias: ['nsfw', 'sfm'],
    category: 'nsfw',
    description: 'Get NSFW videos from SFM Compile',
    usage: `${process.env.PREFIX || '.'}hentai\n${process.env.PREFIX || '.'}hentai <number>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        // ─── Direct number command ──────────────────────
        if (query && !isNaN(query)) {
            const num = parseInt(query);
            if (global._nsfwCache && global._nsfwCache[jid]) {
                const videos = global._nsfwCache[jid];
                if (num >= 1 && num <= videos.length) {
                    await sendVideo(sock, jid, videos[num - 1], msg);
                    return;
                }
            }
            await sock.sendMessage(jid, { text: '❌ *Invalid selection.*' }, { quoted: msg });
            return;
        }

        // ─── Reply to list with number ──────────────────
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            if (listCache[quotedId]) {
                const num = parseInt(query);
                const cache = listCache[quotedId];
                if (!isNaN(num) && num >= 1 && num <= cache.videos.length) {
                    await sendVideo(sock, jid, cache.videos[num - 1], msg);
                    return;
                }
                await sock.sendMessage(jid, { text: '❌ *Invalid number.*' }, { quoted: msg });
                return;
            }
        }

        // ─── Fetch list (with fallback) ──────────────────
        await sock.sendMessage(jid, { react: { text: '🔞', key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: '🔍 *Fetching NSFW videos...*' });

        let videos = [];

        try {
            // Try API with timeout & retry
            const apiUrl = 'https://sfmcompile.club/wp-json/sfm/v1/random';
            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const data = response.data;
            if (data.success && data.results && data.results.length > 0) {
                videos = data.results;
            } else {
                throw new Error('No results');
            }
        } catch (err) {
            console.warn('⚠️ API failed, using fallback data:', err.message);
            // ─── Use hardcoded fallback ──────────────────
            videos = FALLBACK_VIDEOS;
        }

        global._nsfwCache = global._nsfwCache || {};
        global._nsfwCache[jid] = videos;

        // ─── Build list ──────────────────────────────────
        let msgText = `🔞 *NSFW VIDEOS* 🔞\n\n`;
        videos.slice(0, 10).forEach((video, i) => {
            msgText += `${i+1}. ${video.title}\n`;
            msgText += `   🏷️ ${video.category}\n`;
            msgText += `   👁️ ${video.views_count} views | 🔗 ${video.share_count} shares\n\n`;
        });
        msgText += `_Reply with a number, or type ${process.env.PREFIX || '.'}hentai <number> to download._`;
        msgText += WATERMARK;

        const sentMsg = await sock.sendMessage(jid, { text: msgText, edit: statusMsg.key });

        if (sentMsg.key) {
            listCache[sentMsg.key.id] = {
                jid: jid,
                videos: videos,
                timestamp: Date.now()
            };
            setTimeout(() => {
                if (listCache[sentMsg.key.id]) delete listCache[sentMsg.key.id];
            }, 300000);
        }

        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
    }
};

// ─── Send video (with fallback) ──────────────────────────
async function sendVideo(sock, jid, video, msg) {
    await sock.sendMessage(jid, { react: { text: '📥', key: msg.key } });
    const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading:* ${video.title}` });

    try {
        const videoUrl = video.mp4;
        if (!videoUrl) throw new Error('No URL');

        const response = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 50 * 1024 * 1024,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const buffer = Buffer.from(response.data);
        const caption = `🎬 *${video.title}*\n🏷️ ${video.category}\n👁️ ${video.views_count} views\n🔗 ${video.share_count} shares\n${WATERMARK}`;

        if (buffer.length > 16 * 1024 * 1024) {
            await sock.sendMessage(jid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`,
                caption: caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, {
                video: buffer,
                mimetype: 'video/mp4',
                caption: caption
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { text: '✅ *Video sent*', edit: statusMsg.key });
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('Download error:', err.message);
        // ─── Send page URL as fallback ──────────────────
        await sock.sendMessage(jid, {
            text: `⚠️ *Video download failed – watch here:*\n\n` +
                  `🎬 ${video.title}\n` +
                  `🔗 ${video.pageUrl || video.mp4}\n\n` +
                  `(You may need to open in browser.)${WATERMARK}`,
            edit: statusMsg.key
        });
        await sock.sendMessage(jid, { react: { text: '⚠️', key: msg.key } });
    }
}