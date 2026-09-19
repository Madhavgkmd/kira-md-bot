// plugins/lyrics.js – KIRA X MD (JerryCoder API only)
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

            // ─── Try JerryCoder v1 ───
            try {
                const res = await axios.get(`https://jerrycoder.oggyapi.workers.dev/search/lyrics-v1?q=${encodeURIComponent(query)}`, { timeout: 15000 });
                if (res.data && res.data.lyrics) {
                    // Check if lyrics is a string and has content
                    if (typeof res.data.lyrics === 'string' && res.data.lyrics.length > 10) {
                        result = {
                            title: res.data.track?.name || query,
                            artist: res.data.track?.artist || 'Unknown',
                            album: res.data.track?.album || null,
                            duration: res.data.track?.duration || null,
                            lyrics: res.data.lyrics,
                            source: 'v1'
                        };
                    }
                }
            } catch (e) {
                console.log(`JerryCoder v1 error: ${e.message}`);
            }

            // ─── If v1 fails, try JerryCoder v2 ───
            if (!result) {
                try {
                    const res = await axios.get(`https://jerrycoder.oggyapi.workers.dev/search/lyrics-v2?q=${encodeURIComponent(query)}`, { timeout: 15000 });
                    if (res.data && res.data.lyrics) {
                        if (typeof res.data.lyrics === 'string' && res.data.lyrics.length > 10) {
                            result = {
                                title: res.data.track?.name || query,
                                artist: res.data.track?.artist || 'Unknown',
                                album: res.data.track?.album || null,
                                duration: res.data.track?.duration || null,
                                lyrics: res.data.lyrics,
                                source: 'v2'
                            };
                        }
                    }
                } catch (e) {
                    console.log(`JerryCoder v2 error: ${e.message}`);
                }
            }

            if (!result || !result.lyrics || result.lyrics.length < 10) {
                throw new Error('No lyrics found on JerryCoder API');
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