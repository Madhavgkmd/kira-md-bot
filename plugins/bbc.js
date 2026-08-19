const axios = require('axios');

module.exports = {
    name: 'bbc',
    alias: ['bbcnews', 'newsbbc'],
    category: 'search',
    description: 'Fetch latest BBC World News',
    usage: `${process.env.PREFIX || '.'}bbc [number]`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        
        // 🔥 Dynamic Bot Name
        const botName = global.config?.BOT_NAME || process.env.BOT_NAME || 'KIRA X MD';
        
        // യൂസർ എത്ര വാർത്ത വേണമെന്ന് ചോദിച്ചാൽ അത് കൊടുക്കാൻ, ഇല്ലെങ്കിൽ 5 എണ്ണം കൊടുക്കും
        let limit = parseInt(args[0]);
        if (isNaN(limit) || limit < 1 || limit > 10) {
            limit = 5; // പരമാവധി 10 (ലാഗ് വരാതിരിക്കാൻ)
        }

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const apiUrl = `https://www.movanest.xyz/v2/bbc-news?limit=${limit}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });

            const results = res.data?.results;

            if (!results || results.length === 0) {
                throw new Error("No news found.");
            }

            let formatMsg = `📰 *BBC WORLD NEWS* 📰\n\n`;

            for (let i = 0; i < results.length; i++) {
                const article = results[i];
                formatMsg += `*${i + 1}. ${article.title}*\n`;
                if (article.description) formatMsg += `📝 ${article.description}\n`;
                
                if (article.uploadedDate) {
                    // തീയതി നല്ല ഫോർമാറ്റിൽ ആക്കുന്നു
                    const date = new Date(article.uploadedDate).toDateString();
                    formatMsg += `📅 ${date}\n`;
                }
                
                if (article.link) formatMsg += `🔗 ${article.link}\n`;
                formatMsg += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
            }

            // 🔥 വാട്ടർമാർക്ക് ഡൈനാമിക് ആക്കി
            formatMsg += `\n> *${botName}*`;

            // ആദ്യത്തെ വാർത്തയുടെ ഫോട്ടോ വെച്ച് കിടിലൻ പ്രീമിയം ലുക്കിൽ അയക്കുന്നു
            const firstThumbnail = results[0]?.thumbnail || "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/BBC_News_2019.svg/1200px-BBC_News_2019.svg.png";

            await sock.sendMessage(jid, {
                text: formatMsg,
                contextInfo: {
                    externalAdReply: {
                        title: "BBC WORLD NEWS",
                        body: "Latest updates from around the globe",
                        mediaType: 1,
                        thumbnailUrl: firstThumbnail,
                        sourceUrl: "https://www.bbc.com/news",
                        renderLargerThumbnail: true // വലിയ ഫോട്ടോ കാണിക്കാൻ
                    }
                }
            }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("BBC News Error:", err.message);
            // ❌ ഫെയിൽ ആയാൽ എറർ റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ *Failed to fetch BBC news!* Try again later.` }, { quoted: msg });
        }
    }
};