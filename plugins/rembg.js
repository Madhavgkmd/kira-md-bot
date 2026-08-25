const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
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

        // ഏത് തരത്തിലുള്ള ഇമേജ് ആണെങ്കിലും കൃത്യമായി എടുക്കാൻ
        let imageMessage = quoted.imageMessage || 
                           quoted.viewOnceMessageV2?.message?.imageMessage || 
                           quoted.viewOnceMessage?.message?.imageMessage ||
                           quoted.ephemeralMessage?.message?.imageMessage;

        if (!imageMessage) {
            return await sock.sendMessage(jid, { text: '❌ *That is not an image! Please reply to an image.*' }, { quoted: msg });
        }

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        let tempFile = null;
        try {
            // 1. ഫോട്ടോ ഡൗൺലോഡ് ചെയ്യുന്നു
            const buffer = await downloadMediaMessage({ message: { imageMessage } }, 'buffer', {}, { logger: console });
            if (!buffer) throw new Error('Failed to download image');

            // 2. Temp ഫോൾഡർ സെറ്റ് ചെയ്യുന്നു
            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            tempFile = path.join(tempDir, `rembg_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, buffer);

            // 3. remove.bg ഔദ്യോഗിക API-ലേക്ക് ഡാറ്റ അയക്കുന്നു
            const form = new FormData();
            form.append('image_file', fs.createReadStream(tempFile));
            form.append('size', 'auto');

            const apiKey = '8TdrbitPfoV1JEPnKpCrWBhB'; // നീ തന്ന API Key

            const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
                headers: {
                    ...form.getHeaders(),
                    'X-Api-Key': apiKey
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });

            // 4. ബാക്ക്ഗ്രൗണ്ട് റിമൂവ് ചെയ്ത ക്ലീൻ PNG ഇമേജ് അയക്കുന്നു
            await sock.sendMessage(jid, { 
                image: response.data, 
                mimetype: 'image/png'
            }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
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
};

