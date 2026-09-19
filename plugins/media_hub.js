const axios = require('axios');

module.exports = [
    // ─── 1. NORMAL WALLPAPER ───
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
                
                const res = await axios.get('https://eliteprotech-apis.zone.id/wallpaper', { timeout: 15000 });
                const imageUrl = res.data?.result?.url;

                if (!imageUrl) throw new Error("No image URL found");

                await sock.sendMessage(
                    jid, 
                    { image: { url: imageUrl }, caption: '🖼️ *Random Wallpaper*' }, 
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                console.error("WALLPAPER ERROR:", e.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Failed to fetch wallpaper. Try again later.' }, { quoted: msg });
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

                // 🔥 യൂസർ എന്തെങ്കിലും അടിച്ചാൽ Search ചെയ്യും, അല്ലെങ്കിൽ Random ആയി എടുക്കും!
                let apiUrl = '';
                if (query) {
                    apiUrl = `https://eliteprotech-apis.zone.id/4kwallpaper?type=search&q=${encodeURIComponent(query)}`;
                } else {
                    apiUrl = `https://eliteprotech-apis.zone.id/4kwallpaper?type=random`;
                }

                const res = await axios.get(apiUrl, { timeout: 15000 });
                const results = res.data?.result;

                if (!results || results.length === 0) {
                    await sock.sendMessage(jid, { react: { text: '⚠️', key: msg.key } });
                    return await sock.sendMessage(jid, { text: '❌ No 4K wallpapers found for this query.' }, { quoted: msg });
                }

                // ഒരുപാട് റിസൾട്ട് ഉണ്ടെങ്കിൽ അതിൽ നിന്നും ഒരെണ്ണം റാൻഡം ആയി എടുക്കും (എപ്പോഴും ഒരേ ഫോട്ടോ വരാതിരിക്കാൻ)
                const randomImage = results[Math.floor(Math.random() * results.length)];
                const imageUrl = randomImage.url || randomImage.image;

                if (!imageUrl) throw new Error("No image URL found");

                await sock.sendMessage(
                    jid, 
                    { image: { url: imageUrl }, caption: `✨ *4K Wallpaper*\n📝 Query: ${query ? query : 'Random'}` }, 
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                console.error("4K WALLPAPER ERROR:", e.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Failed to fetch 4K wallpaper. Try again later.' }, { quoted: msg });
            }
        }
    }
];