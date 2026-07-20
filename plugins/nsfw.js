// plugins/nsfw.js – KIRA X MD (NSFW Video Downloader)
const axios = require('axios');

const WATERMARK = `\n\n──────────────\n> *KIRA X MD*`;

// ─── Cache for list messages ─────────────────────────────
const listCache = {}; // key: message ID -> { jid, videos, timestamp }

module.exports = {
    name: 'nsfw',
    alias: ['nsfwvideo', 'sfm'],
    category: 'nsfw',
    description: 'Get NSFW videos from SFM Compile',
    usage: `${process.env.PREFIX || '.'}nsfw\n${process.env.PREFIX || '.'}nsfw <number>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        // ─── Check if it's a direct number command ──────
        if (query && !isNaN(query)) {
            const num = parseInt(query);
            if (global._nsfwCache && global._nsfwCache[jid]) {
                const videos = global._nsfwCache[jid];
                if (num >= 1 && num <= videos.length) {
                    await sendVideo(sock, jid, videos[num - 1], msg);
                    return;
                }
            }
            await sock.sendMessage(jid, { text: '❌ *Invalid selection. Try again.*' }, { quoted: msg });
            return;
        }

        // ─── Check if it's a reply to the list message ──
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            // Check if this reply is to a cached list message
            if (listCache[quotedId]) {
                const num = parseInt(query);
                const cache = listCache[quotedId];
                if (!isNaN(num) && num >= 1 && num <= cache.videos.length) {
                    await sendVideo(sock, jid, cache.videos[num - 1], msg);
                    return;
                }
                await sock.sendMessage(jid, { text: '❌ *Invalid number. Reply with a valid number.*' }, { quoted: msg });
                return;
            }
        }

        // ─── Fetch new list ──────────────────────────────
        await sock.sendMessage(jid, { react: { text: '🔞', key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: '🔍 *Fetching NSFW videos...*' });

        try {
            const apiUrl = 'https://sfmcompile.club/wp-json/sfm/v1/random';
            const response = await axios.get(apiUrl, {
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const data = response.data;
            if (!data.success || !data.results || data.results.length === 0) {
                throw new Error('No videos found');
            }

            const videos = data.results;
            global._nsfwCache = global._nsfwCache || {};
            global._nsfwCache[jid] = videos;

            // ─── Build list message ────────────────────────
            let msgText = `🔞 *NSFW VIDEOS* 🔞\n\n`;
            videos.slice(0, 10).forEach((video, i) => {
                msgText += `${i+1}. ${video.title}\n`;
                msgText += `   🏷️ ${video.category}\n`;
                msgText += `   👁️ ${video.views_count} views | 🔗 ${video.share_count} shares\n\n`;
            });
            msgText += `_Reply with a number, or type ${process.env.PREFIX || '.'}nsfw <number> to download._`;
            msgText += WATERMARK;

            const sentMsg = await sock.sendMessage(jid, { text: msgText, edit: statusMsg.key });
            
            // ─── Cache the message ID for reply detection ──
            if (sentMsg.key) {
                listCache[sentMsg.key.id] = {
                    jid: jid,
                    videos: videos,
                    timestamp: Date.now()
                };
                // Auto-clear after 5 minutes
                setTimeout(() => {
                    if (listCache[sentMsg.key.id]) delete listCache[sentMsg.key.id];
                }, 300000);
            }

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error('NSFW error:', err);
            await sock.sendMessage(jid, { text: '❌ *Failed to fetch videos. Try again later.*', edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
        }
    }
};

// ─── Send selected video ──────────────────────────────────
async function sendVideo(sock, jid, video, msg) {
    await sock.sendMessage(jid, { react: { text: '📥', key: msg.key } });
    const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading:* ${video.title}` });

    try {
        const videoUrl = video.mp4;
        if (!videoUrl) throw new Error('No video URL');

        const response = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const videoBuffer = Buffer.from(response.data);

        const caption = `🎬 *${video.title}*\n` +
                        `🏷️ *Category:* ${video.category}\n` +
                        `👁️ *Views:* ${video.views_count}\n` +
                        `🔗 *Shares:* ${video.share_count}\n` +
                        WATERMARK;

        await sock.sendMessage(jid, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            caption: caption
        }, { quoted: msg });

        await sock.sendMessage(jid, { text: '✅ *Video sent*', edit: statusMsg.key });
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('Download error:', err);
        await sock.sendMessage(jid, { text: '❌ *Failed to download video*', edit: statusMsg.key });
        await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
}