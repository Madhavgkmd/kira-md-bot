const axios = require('axios');

module.exports = {
    name: 'webzip',
    alias: ['sitezip', 'downloadsite'],
    category: 'downloader',
    description: 'Download a website as a ZIP archive',
    usage: '.webzip <URL>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url) {
            // റീപ്ലേ ചെയ്ത മെസ്സേജിൽ ലിങ്ക് ഉണ്ടോ എന്ന് നോക്കുന്നു
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                const text = quoted.conversation || quoted.extendedTextMessage?.text || '';
                const match = text.match(/https?:\/\/[^\s]+/);
                if (match) url = match[0];
            }
        }

        if (!url || !url.startsWith('http')) {
            return await sock.sendMessage(jid, { text: `❌ *Provide a website URL*\n➤ Example: .webzip https://example.com` }, { quoted: msg });
        }

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const apiUrl = `https://jerrycoder.oggyapi.workers.dev/tool/web2zip?url=${encodeURIComponent(url)}`;
            
            // നേരിട്ട് ബഫർ ആയി ഫെച്ച് ചെയ്യുന്നു (No fs needed!)
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const zipBuffer = Buffer.from(response.data);

            const fileName = `website_${new URL(url).hostname}.zip`;
            
            // വാട്ടർമാർക്ക് ഇല്ലാതെ ഡോക്യുമെന്റ് ആയി അയക്കുന്നു
            await sock.sendMessage(jid, {
                document: zipBuffer,
                mimetype: 'application/zip',
                fileName: fileName,
                caption: `📦 *Website Source Code*\n🌐 ${url}`
            }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            
        } catch (err) {
            console.error('WEBZIP ERROR:', err.message);
            
            // ❌ ഫെയിൽ ആയാൽ എറർ റിയാക്ഷനും ക്ലീൻ മെസ്സേജും
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: '❌ *Failed to download website. Please try again later.*' }, { quoted: msg });
        }
    }
};