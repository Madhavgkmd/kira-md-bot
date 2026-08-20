const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'rembg',
    alias: ['removebg', 'bgremove'],
    category: 'media',
    description: 'Remove background from an image',
    usage: '.rembg (reply to an image)',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // റീപ്ലേ ചെയ്ത മെസ്സേജ് ഇമേജ് ആണോ എന്ന് നോക്കുന്നു
        if (!quoted || !quoted.imageMessage) {
            return await sock.sendMessage(jid, { text: '❌ *Please reply to an image!*' }, { quoted: msg });
        }

        // ⏳ ലോഡിങ് റിയാക്ഷൻ (സ്റ്റാറ്റസ് മെസ്സേജ് ഒഴിവാക്കി)
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        let tempFile = null;
        try {
            // 1. ഫോട്ടോ ഡൗൺലോഡ് ചെയ്യുന്നു
            const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: console });
            if (!buffer) throw new Error('Failed to download image');

            // 2. Temp ഫോൾഡർ സെറ്റ് ചെയ്യുന്നു (റൂട്ട് ഡയറക്ടറിയിൽ)
            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            tempFile = path.join(tempDir, `rembg_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, buffer);

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(tempFile));

            // 🔥 Catbox എറർ വരാതിരിക്കാൻ User-Agent ആഡ് ചെയ്തു
            const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders(),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 25000
            });
            
            const imageUrl = uploadRes.data.trim();
            if (!imageUrl.startsWith('http')) throw new Error('Upload to catbox failed');

            // 3. Movanest API-ലേക്ക് ലിങ്ക് കൊടുക്കുന്നു
            const apiUrl = `https://www.movanest.xyz/v2/removebg?image_url=${encodeURIComponent(imageUrl)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 35000 });
            
            let resultBuffer = response.data;
            const contentType = response.headers['content-type'] || '';
            
            // JSON ആണെങ്കിൽ ഉള്ളിൽ നിന്ന് ഇമേജ് ലിങ്ക് എടുക്കാൻ (Smart Parsing)
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

            // 4. വാട്ടർമാർക്ക് ഇല്ലാതെ ട്രാൻസ്പരന്റ് ഇമേജ് ആയി വാട്സാപ്പിലേക്ക് അയക്കുന്നു
            await sock.sendMessage(jid, { 
                image: resultBuffer, 
                mimetype: 'image/png'
            }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error('REMBG ERROR:', err.message);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            
            // 🔥 ക്ലീൻ ആൻഡ് സ്മൂത്ത് എറർ മെസ്സേജ്
            await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
        } finally {
            // ടെമ്പ് ഫയൽ ഡിലീറ്റ് ചെയ്യുന്നു (Storage ഫുൾ ആവാതിരിക്കാൻ)
            if (tempFile && fs.existsSync(tempFile)) {
                try { fs.unlinkSync(tempFile); } catch (e) {}
            }
        }
    }
};