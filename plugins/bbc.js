const axios = require('axios');

module.exports = {
    name: 'bbc',
    alias: ['bbcnews', 'newsbbc'],
    category: 'search',
    description: 'Fetch latest BBC World News',
    usage: '.bbc [number]',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        
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

            // ആദ്യത്തെ വാർത്തയുടെ ഫോട്ടോ വെച്ച് കിടിലൻ പ്രീമിയം ലുക്കിൽ അയക്കുന്നു
            const firstThumbnail = results[0]?.thumbnail || "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/BBC_News_2019.svg/1200px-BBC_News_2019.svg.png";

            // വാട്ടർമാർക്ക് പൂർണ്ണമായി ഒഴിവാക്കി ക്ലീൻ ആയി അയക്കുന്നു
            await sock.sendMessage(jid, {
                text: formatMsg.trim(),
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
            
            // ❌ ഫെയിൽ ആയാൽ എറർ റിയാക്ഷനും സിമ്പിൾ എറർ മെസ്സേജും
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ Something went wrong, please try again later.` }, { quoted: msg });
        }
    }
};