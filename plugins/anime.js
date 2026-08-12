const axios = require('axios');

module.exports = {
    name: 'anime',
    alias: ['searchanime'],
    category: 'anime',
    description: 'Search anime info from AniList',
    usage: `.anime <anime name>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(jid, { 
                text: `❌ *Missing anime name!*\n\n*Example:* .anime Naruto` 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            // 🔥 മാസ്റ്റർ അപ്ഡേറ്റ്: Jikan-ന് പകരം ഏറ്റവും ഫാസ്റ്റ് ആയ AniList API ഉപയോഗിക്കുന്നു!
            const graphqlQuery = `
            query ($search: String) {
              Media (search: $search, type: ANIME) {
                title {
                  romaji
                  english
                }
                episodes
                status
                averageScore
                popularity
                genres
                description
                siteUrl
                coverImage {
                  large
                }
              }
            }`;

            const response = await axios.post('https://graphql.anilist.co', {
                query: graphqlQuery,
                variables: { search: query }
            }, { timeout: 15000 });

            const anime = response.data?.data?.Media;

            if (!anime) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(jid, { text: `❌ *No anime found for "${query}"*` }, { quoted: msg });
            }

            // കൃത്യമായ ഡാറ്റാ ഫീൽഡുകൾ
            const title = anime.title.romaji || 'Unknown';
            const eng = anime.title.english || 'N/A';
            const eps = anime.episodes || 'Unknown';
            const status = anime.status || 'Unknown';
            const score = anime.averageScore ? `${anime.averageScore} / 100` : 'N/A';
            const pop = anime.popularity ? anime.popularity.toLocaleString() : 'N/A';
            const genres = anime.genres ? anime.genres.join(', ') : 'N/A';
            
            // HTML ടാഗുകൾ ഒഴിവാക്കാൻ (AniList ചിലപ്പോൾ HTML തരും)
            const rawSyno = anime.description ? anime.description.replace(/<[^>]*>?/gm, '') : 'No synopsis available.';
            const syno = rawSyno.length > 300 ? rawSyno.substring(0, 300) + '...' : rawSyno;
            
            const url = anime.siteUrl || 'https://anilist.co';
            const imgUrl = anime.coverImage?.large || '';

            const premiumMessage = `🎌 *KIRA ANIME INFO* 🎌\n\n` +
                `📖 *Title:* ${title}\n` +
                `🌐 *English:* ${eng}\n` +
                `📺 *Episodes:* ${eps}\n` +
                `⚡ *Status:* ${status}\n` +
                `⭐ *Score:* ${score}\n` +
                `🔥 *Popularity:* ${pop}\n` +
                `🎭 *Genres:* ${genres}\n\n` +
                `📝 *Synopsis:*\n${syno}\n\n` +
                `🔗 *AniList Link:* ${url}`;

            if (imgUrl) {
                await sock.sendMessage(jid, { 
                    image: { url: imgUrl }, 
                    caption: premiumMessage 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, { text: premiumMessage }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Anime search error:', error.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { 
                text: `❌ *Error occurred while fetching anime info!*\n\n_Reason: ${error.message}_` 
            }, { quoted: msg });
        }
    }
};