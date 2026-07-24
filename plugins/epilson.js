const axios = require('axios');

module.exports = {
    name: 'epsilon',
    alias: ['eai', 'research', 'ask'],
    category: 'search',
    description: 'Epsilon AI - Academic Research Search',
    usage: `${process.env.PREFIX || '.'}epsilon <topic>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(jid, { 
                text: `❌ *Missing Topic!*\n\n➤ Example: ${process.env.PREFIX || '.'}epsilon artificial intelligence` 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const apiUrl = `https://www.movanest.xyz/v2/epsilonai?question=${encodeURIComponent(query)}`;
            const res = await axios.get(apiUrl, { timeout: 20000 });

            // API തരുന്ന "results" അറേ എടുക്കുന്നു
            const results = res.data?.results;

            if (!results || !Array.isArray(results) || results.length === 0) {
                throw new Error("No data received from API.");
            }

            // ആദ്യത്തെ 2 റിസൾട്ടുകൾ മാത്രം എടുത്ത് കിടിലൻ ലുക്കിൽ മാറ്റുന്നു
            let formatMsg = `🤖 *Epsilon AI Research: ${query}*\n\n`;
            const maxResults = Math.min(results.length, 2);

            for (let i = 0; i < maxResults; i++) {
                const r = results[i];
                formatMsg += `📚 *${i + 1}. ${r.title || 'Unknown Title'}*\n`;
                formatMsg += `👨‍🔬 *Authors:* ${r.authors || 'Unknown'}\n`;
                formatMsg += `📅 *Year:* ${r.year || 'N/A'}\n`;
                
                if (r.abstract) {
                    // അബ്സ്ട്രാക്റ്റ് വളരെ വലുതാണെങ്കിൽ ചെറുതാക്കുന്നു
                    const shortAbstract = r.abstract.length > 250 ? r.abstract.substring(0, 250) + '...' : r.abstract;
                    formatMsg += `📝 *Summary:* ${shortAbstract}\n`;
                }
                
                if (r.url) formatMsg += `🔗 *Link:* ${r.url}\n`;
                formatMsg += `\n`;
            }

            formatMsg += `> *KIRA X MD*`;

            await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Epsilon AI Error:", err.message);
            await sock.sendMessage(jid, { text: `❌ *Failed to get data!* Try another topic.` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};