// plugins/rembg.js – KIRA X MD (Remove background from image)
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'rembg',
    alias: ['removebg', 'bgremove'],
    category: 'media',
    description: 'Remove background from an image (reply to an image)',
    usage: `${process.env.PREFIX || '.'}rembg (reply to an image)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        
        // റീപ്ലേ ചെയ്ത മെസ്സേജ് ഇമേജ് ആണോ എന്ന് നോക്കുന്നു
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted || !quoted.imageMessage) {
            return sock.sendMessage(jid, { text: '❌ *Please reply to an image!*' }, { quoted: msg });
        }

        // ⏳ ലോഡിങ് റിയാക്ഷൻ മാത്രം കൊടുക്കുന്നു
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        let tempFile = null;
        try {
            // 1. വാട്സ്ആപ്പിൽ നിന്നും ഫോട്ടോ ഡൗൺലോഡ് ചെയ്യുന്നു
            const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: console });
            if (!buffer) throw new Error('Failed to download image');

            // 2. Catbox.moe ലേക്ക് അപ്‌ലോഡ് ചെയ്ത് പബ്ലിക് ലിങ്ക് ഉണ്ടാക്കുന്നു
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            tempFile = path.join(tempDir, `rembg_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, buffer);

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(tempFile));

            const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                timeout: 20000
            });
            const imageUrl = uploadRes.data.trim();
            if (!imageUrl.startsWith('http')) throw new Error('Upload to catbox failed');

            // 3. പുതിയ Movanest API-ലേക്ക് ആ ലിങ്ക് കൊടുക്കുന്നു
            const apiUrl = `https://www.movanest.xyz/v2/removebg?image_url=${encodeURIComponent(imageUrl)}`;
            
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
            let resultBuffer = response.data;

            // API ചിലപ്പോൾ JSON തന്നാൽ അത് കൈകാര്യം ചെയ്യാൻ (Smart Parsing)
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                const json = JSON.parse(resultBuffer.toString('utf8'));
                const finalUrl = json.data?.url || json.url || json.result || json.image;
                if (finalUrl) {
                    const imgRes = await axios.get(finalUrl, { responseType: 'arraybuffer' });
                    resultBuffer = imgRes.data;
                } else {
                    throw new Error("No image found in API response");
                }
            }

            // 4. ക്യാപ്ഷനും വാട്ടർമാർക്കും ഇല്ലാതെ റിസൾട്ട് വാട്സ്ആപ്പിലേക്ക് അയക്കുന്നു
            await sock.sendMessage(jid, { 
                image: resultBuffer, 
                mimetype: 'image/png'
            }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error('Rembg error:', err.message);
            // ❌ ഫെയിൽ ആയാൽ എറർ റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
        } finally {
            // ടെമ്പ് ഫയൽ ഡിലീറ്റ് ചെയ്യുന്നു (Storage ഫുൾ ആവാതിരിക്കാൻ)
            if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
    }
};