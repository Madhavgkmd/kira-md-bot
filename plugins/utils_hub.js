const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// 🔥 Fast Multi-Server Image Uploader (Catbox ➔ Uguu ➔ Pomf)
async function uploadImage(buffer) {
    const fileName = `media_${Date.now()}.jpg`;

    // 1. Catbox
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: fileName });
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
            timeout: 20000
        });
        const link = String(res.data).trim();
        if (link.startsWith('http')) return link;
    } catch (e) {}

    // 2. Uguu.se
    try {
        const form = new FormData();
        form.append('files[]', buffer, { filename: fileName });
        const res = await axios.post('https://uguu.se/upload.php', form, {
            headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
            timeout: 20000
        });
        const link = res.data?.files?.[0]?.url;
        if (link) return link;
    } catch (e) {}

    // 3. Pomf
    try {
        const form = new FormData();
        form.append('files[]', buffer, { filename: fileName });
        const res = await axios.post('https://pomf.lain.la/upload.php', form, {
            headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
            timeout: 20000
        });
        const link = res.data?.files?.[0]?.url;
        if (link) return link;
    } catch (e) {}

    throw new Error('All image upload servers failed.');
}

module.exports = [
    // ─── 1. APK SEARCH & DOWNLOAD ───
    {
        name: 'apk',
        category: 'utils',
        description: 'Search and download APKs',
        usage: '.apk <app name>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const query = args.join(' ').trim();

            if (!query) {
                return await sock.sendMessage(jid, { text: '⚠️ *Please provide an app name!*\n_Example: .apk free fire_' }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

                const res = await axios.get(`https://eliteprotech-apis.zone.id/apk?q=${encodeURIComponent(query)}`, { timeout: 20000 });
                const data = res.data;
                const results = data?.result || data?.data || data;

                if (!results || (Array.isArray(results) && results.length === 0)) {
                    throw new Error('No APK found.');
                }

                const app = Array.isArray(results) ? results[0] : results;
                const name = app.name || query;
                const size = app.size || 'N/A';
                const link = app.dl_url || app.link || app.download || '';
                const icon = app.icon || '';

                if (!link) throw new Error('Download link not found.');

                const caption = `📦 *APK DOWNLOADER*\n\n📱 *Name:* ${name}\n💾 *Size:* ${size}\n🔗 *Download Link:* ${link}`;

                if (icon) {
                    await sock.sendMessage(jid, { image: { url: icon }, caption: caption }, { quoted: msg });
                } else {
                    await sock.sendMessage(jid, { text: caption }, { quoted: msg });
                }

                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (err) {
                console.error('APK ERROR:', err.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong or APK not found.' }, { quoted: msg });
            }
        }
    },

    // ─── 2. FONT STYLES ───
    {
        name: 'font',
        category: 'utils',
        description: 'Generate fancy font styles',
        usage: '.font <text>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const query = args.join(' ').trim();

            if (!query) {
                return await sock.sendMessage(jid, { text: '⚠️ *Please provide text!*\n_Example: .font KIRA X MD_' }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

                const res = await axios.get(`https://eliteprotech-apis.zone.id/font?text=${encodeURIComponent(query)}`, { timeout: 15000 });
                const fontResult = res.data?.result || res.data;

                if (!fontResult) throw new Error('Failed to generate fonts.');

                let formatText = `🔤 *FANCY FONTS*\n\n`;
                if (typeof fontResult === 'object') {
                    for (const [key, value] of Object.entries(fontResult)) {
                        formatText += `*${key}:* ${value}\n`;
                    }
                } else {
                    formatText += fontResult;
                }

                await sock.sendMessage(jid, { text: formatText.trim() }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (err) {
                console.error('FONT ERROR:', err.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Failed to generate fonts. Try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 3. OCR (IMAGE TO TEXT) ───
    {
        name: 'ocr',
        category: 'utils',
        description: 'Read text from an image',
        usage: '.ocr (reply to image)',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted || !quoted.imageMessage) {
                return await sock.sendMessage(jid, { text: '⚠️ *Please reply to an image to read text!*' }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

                const mediaBuffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: console });
                if (!mediaBuffer) throw new Error('Media download failed');

                const imageUrl = await uploadImage(mediaBuffer);

                const ocrRes = await axios.get(`https://eliteprotech-apis.zone.id/ocr?image=${encodeURIComponent(imageUrl)}`, { timeout: 25000 });
                const extractedText = ocrRes.data?.result || ocrRes.data?.text || ocrRes.data;

                if (!extractedText) throw new Error('No text found in image.');

                await sock.sendMessage(jid, { text: `📜 *Extracted Text:*\n\n${extractedText}` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (err) {
                console.error('OCR ERROR:', err.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Failed to extract text from image.' }, { quoted: msg });
            }
        }
    }
];