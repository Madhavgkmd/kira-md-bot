const ytSearch = require('yt-search');
const axios = require('axios');

module.exports = {
    name: 'spotify',
    alias: ['sp', 'spotifydl'],
    category: 'downloader',
    description: 'Download audio from Spotify link or song name',
    usage: '.spotify <Spotify URL or Song Name>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(jid, { 
                text: `❌ *What Spotify song do you want?*\n\nExample: .spotify Past Lives` 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

        try {
            let searchTarget = query;
            const isSpotifyUrl = query.match(/(https?:\/\/open\.spotify\.com\/(track|playlist|album)\/[a-zA-Z0-9]+)/gi);

            if (isSpotifyUrl) {
                const url = isSpotifyUrl[0];
                const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
                
                try {
                    const oembedRes = await axios.get(oembedUrl, { timeout: 10000 });
                    if (oembedRes.data && oembedRes.data.title) {
                        searchTarget = `${oembedRes.data.title} ${oembedRes.data.author_name || ''}`.trim();
                    }
                } catch (e) {
                    console.log("Spotify metadata fetch failed, searching as text...");
                }
            }

            const searchResults = await ytSearch(searchTarget);
            const video = searchResults.videos ? searchResults.videos.find(v => v.url) : null;

            if (!video || !video.url) {
                throw new Error('No matching audio stream found.');
            }
            
            const ytUrl = video.url;
            await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

            let audioUrl = '';
            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(ytUrl)}`, 
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3?url=${encodeURIComponent(ytUrl)}`,    
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(ytUrl)}`,             
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(ytUrl)}` 
            ];

            const axiosConfig = {
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36' }
            };

            for (let i = 0; i < apis.length; i++) {
                try {
                    const res = await axios.get(apis[i], axiosConfig);
                    const data = res.data;
                    
                    let tempUrl = data.data?.dl || data.url || data.result?.download_url || data.result?.url || data.result?.audio || data.result;
                    
                    if (tempUrl && typeof tempUrl === 'string' && tempUrl.startsWith('http')) {
                        const check = await axios.head(tempUrl, { timeout: 5000 }).catch(() => null);
                        if (check && check.status === 200) {
                            audioUrl = tempUrl;
                            break;
                        }
                    }
                } catch (e) { continue; }
            }

            if (!audioUrl) throw new Error('All audio servers are currently busy.');

            await sock.sendMessage(jid, { 
                audio: { url: audioUrl }, 
                mimetype: 'audio/mpeg',
                fileName: `${searchTarget.replace(/[^a-zA-Z0-9 ]/g, '')}.mp3`
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

        } catch (err) {
            console.error("Spotify Error:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};