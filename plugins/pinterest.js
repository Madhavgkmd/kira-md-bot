const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'pinterest',
    alias: ['pin', 'pindl', 'pinsearch'],
    category: 'downloader',
    description: 'Download or Search Pinterest media',
    usage: '.pinterest <URL or Query>', 

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const input = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!input) {
            return await sock.sendMessage(jid, { 
                text: `❌ *What do you want from Pinterest?*\n\n📥 *To Download:* .pin <Pinterest Link>\n🔍 *To Search:* .pin anime wallpaper` 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📌", key: msg.key } });

        const isUrlMatch = input.match(/(https?:\/\/(www\.)?(pinterest\.com|pin\.it)\/[^\s]+)/gi);

        if (isUrlMatch) {
            const url = isUrlMatch[0];
            let filePath = '';
            let success = false;

            try {
                const apis = [
                    `https://xeon-apis.onrender.com/pin?url=${encodeURIComponent(url)}`,
                    `https://jerrycoder.oggyapi.workers.dev/down/pinterest?url=${encodeURIComponent(url)}`,
                    `https://api.siputzx.my.id/api/d/pinterest?url=${encodeURIComponent(url)}`,
                    `https://api.ryzendesu.vip/api/downloader/pinterest?url=${encodeURIComponent(url)}`,
                    `https://api-aswin-sparky.koyeb.app/api/downloader/pinterest?url=${encodeURIComponent(url)}`
                ];

                for (let i = 0; i < apis.length; i++) {
                    let mediaUrl = '';
                    let isVideo = false;

                    try {
                        const res = await axios.get(apis[i], { timeout: 15000 });
                        const data = res.data;

                        // 🔥 Xeon API-ക്ക് വേണ്ടി പ്രത്യേകം അപ്ഡേറ്റ് ചെയ്ത ഭാഗം
                        if (data.videos && data.videos.length > 0) {
                            mediaUrl = data.videos[0];
                            isVideo = true;
                        } else if (data.images && data.images.length > 0) {
                            mediaUrl = data.images[0];
                            isVideo = false;
                        } 
                        // ബാക്കപ്പ് API-കൾക്ക് വേണ്ടി
                        else if (typeof data.result === 'string' && data.result.startsWith('http')) {
                            mediaUrl = data.result;
                        } else if (data.data && data.data.url) {
                            mediaUrl = data.data.url;
                        } else if (data.url) {
                            mediaUrl = data.url;
                        } else if (data.result && data.result.url) {
                            mediaUrl = data.result.url;
                        } else if (data.media) {
                            mediaUrl = data.media;
                        }

                        if (!mediaUrl) continue;

                        if (mediaUrl.includes('pincdn.app') && i < apis.length - 1) {
                            continue; 
                        }

                        // എക്സ്റ്റൻഷൻ ചെക്ക് ചെയ്യുന്നു
                        if (!isVideo) {
                            isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video') || (data.result && data.result.type === 'video');
                        }

                        const tempDir = path.join(__dirname, '../temp');
                        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                        const fileName = `pin_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
                        filePath = path.join(tempDir, fileName);

                        // 🔥 Stream എറർ ഒഴിവാക്കാൻ ഹെഡറുകൾ സ്ട്രോങ്ങ് ആക്കി!
                        const writer = fs.createWriteStream(filePath);
                        const mediaRes = await axios({
                            url: mediaUrl,
                            method: 'GET',
                            responseType: 'stream',
                            maxRedirects: 5,
                            timeout: 20000, 
                            headers: { 
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                                'Referer': 'https://www.pinterest.com/',
                                'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5'
                            }
                        });

                        mediaRes.data.pipe(writer);

                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });

                        const stats = fs.statSync(filePath);
                        
                        if (stats.size < 5000) {
                            fs.unlinkSync(filePath);
                            throw new Error("File is corrupted or too small.");
                        }

                        if (isVideo) {
                            await sock.sendMessage(jid, { 
                                video: { url: filePath }, 
                                mimetype: 'video/mp4',
                                caption: '📌 *KIRA X MD PINTEREST*' 
                            }, { quoted: msg });
                        } else {
                            await sock.sendMessage(jid, { 
                                image: { url: filePath }, 
                                mimetype: 'image/jpeg',
                                caption: '📌 *KIRA X MD PINTEREST*' 
                            }, { quoted: msg });
                        }

                        success = true;
                        try { fs.unlinkSync(filePath); } catch (e) {} // അയച്ച ശേഷം ഫയൽ ഡിലീറ്റ് ചെയ്യുന്നു
                        break; 

                    } catch (e) {
                        if (filePath && fs.existsSync(filePath)) {
                            try { fs.unlinkSync(filePath); } catch (err) {}
                        }
                    }
                }

                if (!success) throw new Error("Could not download media from any server.");
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Pinterest DL Error:", err.message); 
                await sock.sendMessage(jid, { text: `❌ *Download failed:* Cannot fetch media at this moment.` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            }

        } else {
            // Search ഭാഗം
            try {
                const searchUrl = `https://jerrycoder.oggyapi.workers.dev/search/pin?q=${encodeURIComponent(input)}&type=image&limit=5`;
                const res = await axios.get(searchUrl, { timeout: 15000 });
                
                let results = [];
                if (res.data.result && Array.isArray(res.data.result)) results = res.data.result;
                else if (res.data.data && Array.isArray(res.data.data)) results = res.data.data;
                else if (Array.isArray(res.data)) results = res.data;

                if (results.length === 0) throw new Error("No pins found for your search.");

                results = results.slice(0, 5);
                await sock.sendMessage(jid, { text: `📥 *Downloading ${results.length} pins for:* ${input}` });

                let sentCount = 0;

                for (const item of results) {
                    const imgUrl = typeof item === 'string' ? item : (item.image || item.url || item.media_url);
                    if (imgUrl) {
                        try {
                            const imgRes = await axios.get(imgUrl, {
                                responseType: 'arraybuffer',
                                timeout: 10000,
                                headers: { 
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                                    'Referer': 'https://www.pinterest.com/'
                                }
                            });
                            
                            await sock.sendMessage(jid, { 
                                image: Buffer.from(imgRes.data), 
                                mimetype: 'image/jpeg',
                                caption: `📌 *KIRA X MD*` 
                            });
                            sentCount++;
                        } catch (e) {}
                    }
                }
                
                if (sentCount === 0) throw new Error("Failed to download images.");
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Pinterest Search Error:", err.message); 
                await sock.sendMessage(jid, { text: `❌ *Search failed:* Server busy.` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            }
        }
    }
};
