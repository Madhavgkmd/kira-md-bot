// plugins/lyrics.js – KIRA X MD (v1 ➔ v2 ➔ Shazam Fallback)
const axios = require('axios');

const WATERMARK = `\n\n──────────────\n> *${global.config?.BOT_NAME || 'KIRA X MD'}*`;

module.exports = {
    name: 'lyrics',
    alias: ['lyric', 'songlyrics'],
    category: 'search',
    description: 'Get lyrics for a song',
    usage: `${process.env.PREFIX || '.'}lyrics <song name>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            await sock.sendMessage(jid, {
                text: `🎤 *LYRICS*\n\n❌ *Missing song name*\n➤ Example: ${process.env.PREFIX || '.'}lyrics Jhol Maanu`
            }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "🎤", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 *Searching lyrics for:* "${query}"...` });

        try {
            let result = null;

            // ─── Helper function to safely extract lyrics text ───
            const parseLyrics = (data, sourceName) => {
                if (!data) return null;

                let target = data.result || data;
                let text = '';
                let title = target.track?.name || target.title || target.name || query;
                let artist = target.track?.artist || target.artist || target.artist_name || 'Unknown';
                let album = target.track?.album || target.album || target.album_name || null;
                let duration = target.track?.duration || target.duration || null;

                // Check various keys where lyrics might be stored
                if (target.lyrics) {
                    if (typeof target.lyrics === 'string') {
                        text = target.lyrics;
                    } else if (typeof target.lyrics === 'object') {
                        text = target.lyrics.plain_lyrics || target.lyrics.text || target.lyrics.synced_lyrics || '';
                    }
                } else if (typeof target.result === 'string') {
                    text = target.result;
                } else if (typeof target.plain_lyrics === 'string') {
                    text = target.plain_lyrics;
                }

                if (typeof text === 'string' && text.trim().length > 10) {
                    return { title, artist, album, duration, lyrics: text.trim(), source: sourceName };
                }
                return null;
            };

            // ─── 1. Try JerryCoder v1 FIRST ───
            try {
                const res = await axios.get(`https://jerrycoder.oggyapi.workers.dev/search/lyrics-v1?q=${encodeURIComponent(query)}`, { timeout: 15000 });
                result = parseLyrics(res.data, 'v1');
            } catch (e) {
                console.log(`JerryCoder v1 error: ${e.message}`);
            }

            // ─── 2. If v1 fails or lyrics is blank/invalid, try JerryCoder v2 (Malayalam support) ───
            if (!result || !result.lyrics || result.lyrics.length < 10) {
                try {
                    const res = await axios.get(`https://jerrycoder.oggyapi.workers.dev/search/lyrics-v2?q=${encodeURIComponent(query)}`, { timeout: 15000 });
                    result = parseLyrics(res.data, 'v2');
                } catch (e) {
                    console.log(`JerryCoder v2 error: ${e.message}`);
                }
            }

            // ─── 3. If both v1 & v2 fail, fallback to Shazam API ───
            if (!result || !result.lyrics || result.lyrics.length < 10) {
                try {
                    const res = await axios.get(`https://api.siputzx.my.id/api/s/shazam?query=${encodeURIComponent(query)}`, { timeout: 15000 });
                    if (res.data && res.data.status) {
                        result = parseLyrics(res.data, 'shazam');
                    }
                } catch (e) {
                    console.log(`Shazam fallback error: ${e.message}`);
                }
            }

            if (!result || !result.lyrics || result.lyrics.length < 10) {
                throw new Error('No lyrics found from any available APIs');
            }

            // ─── Clean lyrics ───
            let lyrics = result.lyrics
                .replace(/.*Contributors.*/gi, '')
                .replace(/.*Lyrics.*/gi, '')
                .replace(/.*Embed.*/gi, '')
                .trim();

            if (lyrics.length > 3800) {
                lyrics = lyrics.substring(0, 3800) + '\n\n... (truncated)';
            }

            // ─── Build response ───
            let responseText = `🎤 *LYRICS* 🎤\n\n`;
            responseText += `📖 *Title* : ${result.title}\n`;
            responseText += `🎤 *Artist* : ${result.artist}\n`;
            if (result.album) responseText += `💿 *Album* : ${result.album}\n`;
            if (result.duration) responseText += `⏱️ *Duration* : ${result.duration}\n`;
            responseText += `\n━━━━━━━━━━━━━━━━━━━\n`;
            responseText += `${lyrics}\n`;
            responseText += `━━━━━━━━━━━━━━━━━━━\n`;
            responseText += WATERMARK;

            await sock.sendMessage(jid, { text: responseText, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error('Lyrics error:', err.message);
            await sock.sendMessage(jid, { text: `❌ *Lyrics not found for:* "${query}"`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};