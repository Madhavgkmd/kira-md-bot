const axios = require('axios');

module.exports = {
    name: 'news',
    alias: ['newscat', 'newssites', 'newsfetch'],
    category: 'search',
    description: 'KIRA News Hub (Categories, Sites & Fetch)',
    usage: `${process.env.PREFIX || '.'}news`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = process.env.PREFIX || '.';
        
        // 🔥 Dynamic Bot Name Helper
        const botName = global.config?.BOT_NAME || process.env.BOT_NAME || 'KIRA X MD';
        
        // യൂസർ എന്താണ് ചെയ്യാൻ ഉദ്ദേശിക്കുന്നത് എന്ന് മനസ്സിലാക്കാൻ
        const action = args[0]?.toLowerCase();
        const categoryArg = args[1]?.toLowerCase();
        const numSites = args[2] || 5; // മൂന്നാമതായി നമ്പർ കൊടുത്തില്ലെങ്കിൽ 5 എന്ന് എടുക്കും

        // 1. വെറുതെ .news എന്ന് അടിച്ചാൽ മിനി-മെനു കാണിക്കാൻ
        if (!action || !['cat', 'categories', 'sites', 'fetch', 'get'].includes(action)) {
            const menuText = `📰 *NEWS HUB* 📰\n\n` +
                `*1. View Categories:*\n➤ \`${prefix}news cat\`\n\n` +
                `*2. View Sites by Category:*\n➤ \`${prefix}news sites <category>\`\n_(Example: ${prefix}news sites indian)_\n\n` +
                `*3. Read News:*\n➤ \`${prefix}news fetch <category> <number>\`\n_(Example: ${prefix}news fetch international 5)_\n\n` +
                `> *${botName}*`;
            
            return sock.sendMessage(jid, { text: menuText }, { quoted: msg });
        }

        // ⏳ ലോഡിങ് റിയാക്ഷൻ കൊടുക്കുന്നു
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            // ─── OPTION 1: FETCH CATEGORIES ───
            if (action === 'cat' || action === 'categories') {
                const res = await axios.get('https://www.movanest.xyz/v2/news/categories', { timeout: 15000 });
                let categories = res.data?.data || res.data?.results || res.data?.categories || res.data;

                if (!categories || categories.length === 0) throw new Error("No categories found.");

                let formatMsg = `📰 *Available News Categories:*\n\n`;
                categories.forEach((cat, i) => {
                    let catName = typeof cat === 'string' ? cat : (cat.name || cat.title || "Unknown");
                    catName = catName.charAt(0).toUpperCase() + catName.slice(1);
                    formatMsg += `*${i + 1}.* ${catName}\n`;
                });
                formatMsg += `\n> *${botName}*`;

                await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });
            }

            // ─── OPTION 2: FETCH SITES BY CATEGORY ───
            else if (action === 'sites') {
                if (!categoryArg) {
                    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                    return sock.sendMessage(jid, { text: `❌ *Missing Category!*\nExample: \`${prefix}news sites tech\`` }, { quoted: msg });
                }

                const res = await axios.get(`https://www.movanest.xyz/v2/news/sitesbycategory?category=${encodeURIComponent(categoryArg)}`, { timeout: 15000 });
                let sites = res.data?.data || res.data?.results || res.data?.sites || res.data;

                if (!sites || sites.length === 0) throw new Error("No sites found.");

                let formatMsg = `🌐 *News Sites: ${categoryArg.toUpperCase()}*\n\n`;
                const maxSites = Math.min(sites.length, 20); // പരമാവധി 20 എണ്ണം മാത്രം കാണിക്കുന്നു
                for (let i = 0; i < maxSites; i++) {
                    let siteName = typeof sites[i] === 'string' ? sites[i] : (sites[i].name || sites[i].title || "Unknown Site");
                    formatMsg += `*${i + 1}.* ${siteName}\n`;
                }
                formatMsg += `\n> *${botName}*`;

                await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });
            }

            // ─── OPTION 3: FETCH REAL NEWS ───
            else if (action === 'fetch' || action === 'get') {
                if (!categoryArg) {
                    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                    return sock.sendMessage(jid, { text: `❌ *Missing Category!*\nExample: \`${prefix}news fetch international 3\`` }, { quoted: msg });
                }

                const res = await axios.get(`https://www.movanest.xyz/v2/news/fetch?category=${encodeURIComponent(categoryArg)}&numSites=${numSites}`, { timeout: 20000 });
                let articles = res.data?.data || res.data?.results || res.data?.news || res.data;

                if (!articles || articles.length === 0) throw new Error("No news found.");

                let formatMsg = `🗞️ *LATEST NEWS: ${categoryArg.toUpperCase()}*\n\n`;
                
                // വാട്സ്ആപ്പ് ക്രാഷ് ആവാതിരിക്കാൻ പരമാവധി 5 വാർത്തകൾ മാത്രം കാണിക്കുന്നു
                const maxNews = Math.min(articles.length, 5); 
                for (let i = 0; i < maxNews; i++) {
                    const article = articles[i];
                    formatMsg += `*${i + 1}. ${article.title || 'Breaking News'}*\n`;
                    if (article.source) formatMsg += `🏢 Source: _${article.source}_\n`;
                    if (article.description || article.snippet) {
                        const desc = article.description || article.snippet;
                        formatMsg += `📝 ${desc.length > 150 ? desc.substring(0, 150) + '...' : desc}\n`;
                    }
                    if (article.url || article.link) formatMsg += `🔗 Link: ${article.url || article.link}\n`;
                    formatMsg += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
                }
                formatMsg += `\n> *${botName}*`;

                await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });
            }

            // ✅ എല്ലാം കഴിഞ്ഞ് സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("News Plugin Error:", err.message);
            // ❌ ഫെയിൽ ആയാൽ എറർ റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ *Error fetching data!* Check the category name and try again.` }, { quoted: msg });
        }
    }
};