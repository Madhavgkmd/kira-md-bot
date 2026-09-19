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
    // ─── 1. FONT STYLES ───
    {
        name: 'font',
        category: 'utility',
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

                const res = await axios.get(`https://eliteprotech-apis.zone.id/fun/font?text=${encodeURIComponent(query)}`, { timeout: 15000 });
                const fontResults = res.data?.results;

                if (!fontResults || !Array.isArray(fontResults)) {
                    throw new Error('Failed to generate fonts.');
                }

                let formatText = `🔤 *FANCY FONTS*\n\n`;
                
                // ഫോണ്ടുകൾ എല്ലാം ഒന്നിന് താഴെ ഒന്നായി ലിസ്റ്റ് ചെയ്യുന്നു
                fontResults.forEach(font => {
                    formatText += `*${font.name}:*\n${font.text}\n\n`;
                });

                await sock.sendMessage(jid, { text: formatText.trim() }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (err) {
                console.error('FONT ERROR:', err.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Failed to generate fonts. Try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 2. OCR (IMAGE TO TEXT) ───
    {
        name: 'ocr',
        category: 'utility',
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

                // ഇമേജ് ഡൗൺലോഡ് ചെയ്യുന്നു
                const mediaBuffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: console });
                if (!mediaBuffer) throw new Error('Media download failed');

                // ഇമേജ് സെർവറിലേക്ക് അപ്‌ലോഡ് ചെയ്ത് ലിങ്ക് എടുക്കുന്നു
                const imageUrl = await uploadImage(mediaBuffer);

                // ആ ലിങ്ക് വെച്ച് OCR API വിളിക്കുന്നു
                const ocrRes = await axios.get(`https://eliteprotech-apis.zone.id/tools/ocr?url=${encodeURIComponent(imageUrl)}`, { timeout: 25000 });
                const extractedText = ocrRes.data?.text;

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