const axios = require('axios');

module.exports = {
    name: 'tinyurl',
    alias: ['shorten', 'shorturl', 'tiny'],
    category: 'tool',
    description: 'Shorten a long URL',
    usage: `${process.env.PREFIX || '.'}tinyurl <url>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const urlToShorten = args[0];

        if (!urlToShorten || !urlToShorten.startsWith('http')) {
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            return sock.sendMessage(jid, { text: `❌ *Please provide a valid URL!*\n\n➤ Example: \`${process.env.PREFIX || '.'}tinyurl https://google.com\`` }, { quoted: msg });
        }

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const apiUrl = `https://abhi-api.vercel.app/api/tool/tinyurl?url=${encodeURIComponent(urlToShorten)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            
            // ലിങ്ക് തിരിച്ചറിയാനുള്ള Smart Parser
            const data = res.data;
            let shortUrl = typeof data.result === 'string' ? data.result : (data.result?.link || data.result?.shortUrl || data.link || data.url);

            if (!shortUrl) throw new Error("Could not shorten the URL");

            let formatMsg = `🔗 *URL SHORTENED* 🔗\n\n`;
            formatMsg += `*Original:* ${urlToShorten}\n`;
            formatMsg += `*Short URL:* ${shortUrl}\n\n`;
            formatMsg += `> *KIRA X MD*`;

            await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });
            
            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("TinyURL Error:", err.message);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ *Failed to shorten the URL!*\nMake sure the link is working.` }, { quoted: msg });
        }
    }
};