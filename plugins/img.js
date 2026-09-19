const axios = require('axios');

module.exports = {
    name: 'img',
    alias: ['image'],
    category: 'search',
    description: 'Search and send top 5 relevant images (Safe Search)',
    usage: '.img <query>', // .env ഒഴിവാക്കി നേരിട്ട് കൊടുക്കുന്നു

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();
        
        if (!query) return await sock.sendMessage(jid, { text: '❌ *Search term missing*' }, { quoted: msg });

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

        try {
            // API കീ നേരിട്ട് ഇവിടെ കൊടുത്തിരിക്കുന്നു
            const apiKey = "7b13fc759f637422a4fbad70a966323a4350c6dd8cc16a7cd24f7ab61fa7f9f5";
            const url = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&safe=active&api_key=${apiKey}`;
            
            // Railway-ൽ ഹാങ് ആവാതിരിക്കാൻ 15 സെക്കൻഡ് Timeout ആഡ് ചെയ്തു
            const response = await axios.get(url, { timeout: 15000 });
            const results = response.data.images_results?.slice(0, 5) || [];
            
            if (results.length === 0) throw new Error('No images found');

            for (const item of results) {
                const imgUrl = item.original || item.thumbnail;
                
                // ഓരോ ഇമേജ് അയക്കുമ്പോഴും ചെറിയൊരു ഇടവേള (WhatsApp-ന്റെ സുരക്ഷയ്ക്ക്)
                await sock.sendMessage(jid, { 
                    image: { url: imgUrl }, 
                    caption: `✅ *Result for: ${query}*` 
                });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Image search error:", err.message);
            await sock.sendMessage(jid, { text: '❌ Failed to fetch images. Server might be busy.' }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};