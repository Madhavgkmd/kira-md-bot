const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ─── HELPER: Upload to Catbox to get Image URL ───
async function uploadToCatbox(buffer) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, 'image.png');
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
    });
    return res.data; // Returns the URL as text
}

module.exports = [
    {
        name: 'rembg',
        alias: ['removebg', 'bgremove'],
        category: 'media',
        description: 'Remove background using official remove.bg API',
        usage: '.rembg (reply to an image)',

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                return await sock.sendMessage(jid, { text: '❌ *Please reply to an image!*' }, { quoted: msg });
            }

            let imageMessage = quoted.imageMessage || 
                               quoted.viewOnceMessageV2?.message?.imageMessage || 
                               quoted.viewOnceMessage?.message?.imageMessage ||
                               quoted.ephemeralMessage?.message?.imageMessage;

            if (!imageMessage) {
                return await sock.sendMessage(jid, { text: '❌ *That is not an image! Please reply to an image.*' }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

            let tempFile = null;
            try {
                const buffer = await downloadMediaMessage({ message: { imageMessage } }, 'buffer', {}, { logger: console });
                if (!buffer) throw new Error('Failed to download image');

                const tempDir = path.join(process.cwd(), 'temp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                
                tempFile = path.join(tempDir, `rembg_${Date.now()}.jpg`);
                fs.writeFileSync(tempFile, buffer);

                const form = new FormData();
                form.append('image_file', fs.createReadStream(tempFile));
                form.append('size', 'auto');

                const apiKey = '8TdrbitPfoV1JEPnKpCrWBhB'; 

                const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
                    headers: {
                        ...form.getHeaders(),
                        'X-Api-Key': apiKey
                    },
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                await sock.sendMessage(jid, { 
                    image: response.data, 
                    mimetype: 'image/png'
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

            } catch (err) {
                console.error('REMBG ERROR:', err.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ *Background removal failed. Check if your API key limit is reached.*' }, { quoted: msg });
            } finally {
                if (tempFile && fs.existsSync(tempFile)) {
                    try { fs.unlinkSync(tempFile); } catch (e) {}
                }
            }
        }
    },

    {
        name: 'upscale',
        alias: ['hd', 'enhance', '4k'],
        category: 'media',
        description: 'Upscale and enhance image quality',
        usage: '.upscale (reply to an image)',

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                return await sock.sendMessage(jid, { text: '❌ *Please reply to an image!*' }, { quoted: msg });
            }

            let imageMessage = quoted.imageMessage || 
                               quoted.viewOnceMessageV2?.message?.imageMessage || 
                               quoted.viewOnceMessage?.message?.imageMessage ||
                               quoted.ephemeralMessage?.message?.imageMessage;

            if (!imageMessage) {
                return await sock.sendMessage(jid, { text: '❌ *That is not an image! Please reply to an image.*' }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

            try {
                // 1. Download image buffer
                const buffer = await downloadMediaMessage({ message: { imageMessage } }, 'buffer', {}, { logger: console });
                if (!buffer) throw new Error('Failed to download image');

                // 2. Upload to Catbox to get a URL
                const imageUrl = await uploadToCatbox(buffer);

                // 3. Request Jerrycoder Upscale API
                const apiUrl = `https://jerrycoder.oggyapi.workers.dev/tool/upscale-v1?img=${encodeURIComponent(imageUrl)}&json=true`;
                const response = await axios.get(apiUrl, { timeout: 30000 });
                
                // Extracting URL from JSON response
                const upscaledUrl = response.data?.result || response.data?.url || response.data;
                
                if (!upscaledUrl || typeof upscaledUrl !== 'string' || !upscaledUrl.startsWith('http')) {
                     throw new Error('Invalid API response');
                }

                // 4. Send the Enhanced Image
                await sock.sendMessage(jid, { 
                    image: { url: upscaledUrl }, 
                    caption: '✨ *HD Upscaled Successfully!*'
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

            } catch (err) {
                console.error('UPSCALE ERROR:', err.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ *Failed to upscale image. Server might be busy!*' }, { quoted: msg });
            }
        }
    }
];