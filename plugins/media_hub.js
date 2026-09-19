const axios = require('axios');

module.exports = [
    // ─── 1. NORMAL WALLPAPER (Randomized from categories) ───
    {
        name: 'wallpaper',
        alias: ['wp'],
        category: 'media',
        description: 'Get random wallpapers',
        usage: '.wallpaper',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
                
                // Random ആയി ഒരു കാറ്റഗറി എടുക്കാൻ
                const categories = ['nature', 'city', 'cars', 'space', 'anime', 'dark', 'aesthetic', 'minimalist'];
                const randomQuery = categories[Math.floor(Math.random() * categories.length)];
                
                // Same API വെച്ച് സർച്ച് ചെയ്യുന്നു 
                const apiUrl = `https://eliteprotech-apis.zone.id/search/4kwallpaper?q=${randomQuery}&type=search`;
                const res = await axios.get(apiUrl, { timeout: 15000 });
                const results = res.data?.results;

                if (!results || results.length === 0) throw new Error("No wallpapers found in API");

                // ലിസ്റ്റിൽ നിന്നും ഒരു റാൻഡം വാൾപേപ്പർ എടുക്കുന്നു
                const randomImage = results[Math.floor(Math.random() * results.length)];
                const imageUrl = randomImage.thumbnail; // JSON-ൽ ഉള്ള thumbnail

                if (!imageUrl) throw new Error("No image URL found");

                await sock.sendMessage(
                    jid, 
                    { 
                        image: { url: imageUrl }, 
                        caption: `🖼️ *Random Wallpaper*\n📝 *Theme:* ${randomQuery}` 
                    }, 
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                console.error("[PLUGIN ERROR - wallpaper]:", e.message || e);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: `❌ *Failed to fetch wallpaper!*\n\n*Error:* \`\`\`${e.message}\`\`\`` }, { quoted: msg });
            }
        }
    },

    // ─── 2. 4K WALLPAPER (SMART SEARCH) ───
    {
        name: '4k',
        category: 'media',
        description: 'Search 4K Wallpapers',
        usage: '.4k <query>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const query = args.join(' ').trim();

            try {
                await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

                // യൂസർ ഒന്നും അടിച്ചില്ലെങ്കിൽ Random ആയി എടുക്കും
                let searchWord = query;
                if (!searchWord) {
                    const categories = ['nature', 'abstract', 'gaming', 'movies', 'technology'];
                    searchWord = categories[Math.floor(Math.random() * categories.length)];
                }

                const apiUrl = `https://eliteprotech-apis.zone.id/search/4kwallpaper?q=${encodeURIComponent(searchWord)}&type=search`;
                const res = await axios.get(apiUrl, { timeout: 15000 });
                const results = res.data?.results;

                if (!results || results.length === 0) {
                    await sock.sendMessage(jid, { react: { text: '⚠️', key: msg.key } });
                    return await sock.sendMessage(jid, { text: `❌ *No 4K wallpapers found for "${searchWord}"*` }, { quoted: msg });
                }

                // റിസൾട്ടിൽ നിന്നും ഒരെണ്ണം റാൻഡം ആയി എടുക്കും
                const randomImage = results[Math.floor(Math.random() * results.length)];
                const imageUrl = randomImage.thumbnail; 

                if (!imageUrl) throw new Error("No image URL found in the selected result");

                await sock.sendMessage(
                    jid, 
                    { 
                        image: { url: imageUrl }, 
                        caption: `✨ *4K Wallpaper*\n🔍 *Search:* ${searchWord}\n🏷️ *Title:* ${randomImage.title}` 
                    }, 
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                console.error("[PLUGIN ERROR - 4k]:", e.message || e);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: `❌ *Failed to fetch 4K wallpaper!*\n\n*Error:* \`\`\`${e.message}\`\`\`` }, { quoted: msg });
            }
        }
    }
];