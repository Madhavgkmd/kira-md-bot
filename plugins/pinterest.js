const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────
// API ഇല്ലാതെ നേരിട്ട് Pinterest ഇമേജുകൾ സെർച്ച് ചെയ്യുന്ന ഫംഗ്ഷൻ
// ─────────────────────────────────────────
async function directPinSearch(query) {
    try {
        const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}&data=${encodeURIComponent(JSON.stringify({
            options: {
                isPrefetch: false,
                query: query,
                scope: "pins",
                no_fetch_context_on_resource: false
            },
            context: {}
        }))}`;

        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Referer': 'https://www.pinterest.com/',
                'Accept': 'application/json, text/javascript, */*, q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 15000
        });

        const results = res.data?.resource_response?.data?.results || [];
        const images = [];

        for (const pin of results) {
            const img = pin.images?.orig?.url || pin.images?.['736x']?.url || pin.images?.['474x']?.url;
            if (img && !images.includes(img)) {
                images.push(img);
            }
            if (images.length >= 5) break; // പരമാവധി 5 ഫോട്ടോകൾ എടുക്കുന്നു
        }

        return images;
    } catch (e) {
        console.error("Direct Pinterest Scraper Error:", e.message);
        return [];
    }
}

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
            // ─────────────────────────────────────
            // DOWNLOAD URL LOGIC (APIs USED)
            // ─────────────────────────────────────
            const url = isUrlMatch[0];
            let filePath = '';
            let success = false;

            try {
                const apis = [
                    `https://jerrycoder.oggyapi.workers.dev/down/pinterest?url=${encodeURIComponent(url)}`,
                    `https://xeon-apis.onrender.com/pin?url=${encodeURIComponent(url)}`,
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

                        if (data.videos && data.videos.length > 0) {
                            mediaUrl = data.videos[0];
                            isVideo = true;
                        } else if (data.images && data.images.length > 0) {
                            mediaUrl = data.images[0];
                            isVideo = false;
                        } else if (typeof data.result === 'string' && data.result.startsWith('http')) {
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
                        if (mediaUrl.includes('pincdn.app') && i < apis.length - 1) continue; 

                        if (!isVideo) {
                            isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video') || (data.result && data.result.type === 'video');
                        }

                        const tempDir = path.join(__dirname, '../temp');
                        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                        const fileName = `pin_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
                        filePath = path.join(tempDir, fileName);

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
                            throw new Error("File corrupted or too small.");
                        }

                        if (isVideo) {
                            await sock.sendMessage(jid, { 
                                video: { url: filePath }, 
                                mimetype: 'video/mp4' 
                            }, { quoted: msg });
                        } else {
                            await sock.sendMessage(jid, { 
                                image: { url: filePath }, 
                                mimetype: 'image/jpeg' 
                            }, { quoted: msg });
                        }

                        success = true;
                        try { fs.unlinkSync(filePath); } catch (e) {} 
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
            // ─────────────────────────────────────
            // SEARCH LOGIC (DIRECT SCRAPING - NO API)
            // ─────────────────────────────────────
            try {
                const results = await directPinSearch(input);

                if (!results || results.length === 0) {
                    throw new Error("No pins found.");
                }

                await sock.sendMessage(jid, { text: `📥 *Downloading ${results.length} pins for:* ${input}` }, { quoted: msg });

                let sentCount = 0;

                for (const imgUrl of results) {
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
                            mimetype: 'image/jpeg' 
                        });
                        sentCount++;
                    } catch (e) {
                        console.log("Failed to download image:", imgUrl);
                    }
                }
                
                if (sentCount === 0) throw new Error("Failed to download images.");
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Pinterest Search Error:", err.message); 
                await sock.sendMessage(jid, { text: `❌ *Search failed:* Could not fetch Pinterest results directly.` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            }
        }
    }
};

