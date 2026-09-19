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
            // ─────────────────────────────────────
            // DOWNLOAD URL LOGIC
            // ─────────────────────────────────────
            const url = isUrlMatch[0];
            let success = false;

            try {
                // JerryCoder API ഒന്നാമതായി സെറ്റ് ചെയ്തു
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

                        // Extract URL
                        if (data.url && typeof data.url === 'string') {
                            mediaUrl = data.url;
                        } else if (data.videos && data.videos.length > 0) {
                            mediaUrl = data.videos[0];
                        } else if (data.images && data.images.length > 0) {
                            mediaUrl = data.images[0];
                        } else if (typeof data.result === 'string' && data.result.startsWith('http')) {
                            mediaUrl = data.result;
                        } else if (data.data && data.data.url) {
                            mediaUrl = data.data.url;
                        } else if (data.result && data.result.url) {
                            mediaUrl = data.result.url;
                        } else if (data.media) {
                            mediaUrl = data.media;
                        }

                        if (!mediaUrl || !mediaUrl.startsWith('http')) continue;

                        // Initial fallback guess for video (checking thumbnail for /videos/ path)
                        isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video') || (data.thumbnail && data.thumbnail.includes('/videos/'));

                        const tempDir = path.join(__dirname, '../temp');
                        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                        const mediaRes = await axios({
                            url: mediaUrl,
                            method: 'GET',
                            responseType: 'stream',
                            maxRedirects: 5,
                            timeout: 20000, 
                            headers: { 
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                                'Referer': 'https://www.pinterest.com/',
                                'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,image/*;q=0.6,*/*;q=0.5'
                            }
                        });

                        // Accurate content-type checking to determine if it is a video
                        const contentType = mediaRes.headers['content-type'] || '';
                        if (contentType.includes('video')) {
                            isVideo = true;
                        } else if (contentType.includes('image')) {
                            isVideo = false;
                        }

                        const ext = isVideo ? '.mp4' : '.jpg';
                        const finalFilePath = path.join(tempDir, `pin_${Date.now()}${ext}`);
                        const writer = fs.createWriteStream(finalFilePath);
                        
                        mediaRes.data.pipe(writer);

                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });

                        const stats = fs.statSync(finalFilePath);
                        
                        if (stats.size < 5000) {
                            fs.unlinkSync(finalFilePath);
                            throw new Error("File is corrupted or too small.");
                        }

                        if (isVideo) {
                            await sock.sendMessage(jid, { 
                                video: { url: finalFilePath }, 
                                mimetype: 'video/mp4'
                            }, { quoted: msg });
                        } else {
                            await sock.sendMessage(jid, { 
                                image: { url: finalFilePath }, 
                                mimetype: 'image/jpeg'
                            }, { quoted: msg });
                        }

                        success = true;
                        try { fs.unlinkSync(finalFilePath); } catch (e) {} 
                        break; 

                    } catch (e) {
                        continue; // Try next API if this one fails
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
            // SEARCH LOGIC (USING YOUR VERCEL API)
            // ─────────────────────────────────────
            try {
                const searchUrl = `https://kiraxmd-api.vercel.app/api/pinsearch?q=${encodeURIComponent(input)}`;
                const res = await axios.get(searchUrl, { timeout: 15000 });
                
                const results = res.data.result;

                if (!results || results.length === 0) throw new Error("No pins found for your search.");

                await sock.sendMessage(jid, { text: `📥 *Downloading ${results.length} pins for:* ${input}` });

                let sentCount = 0;

                for (const imgUrl of results) {
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
                                mimetype: 'image/jpeg'
                            });
                            sentCount++;
                        } catch (e) {
                            console.log("Failed to download image:", imgUrl);
                        }
                    }
                }
                
                if (sentCount === 0) throw new Error("Failed to download images.");
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Pinterest Search Error:", err.message); 
                await sock.sendMessage(jid, { text: `❌ *Search failed:* Could not fetch results from API.` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            }
        }
    }
};