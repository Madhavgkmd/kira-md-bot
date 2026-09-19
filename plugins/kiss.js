const axios = require('axios');

module.exports = {
    name: "kiss",
    alias: [ "slap", "pat"],
    category: "anime",
    description: "Send anime reaction images",
    usage: ".kiss <tag someone>",

    async execute(sock, msg, args, cmd) {
        const jid = msg.key.remoteJid;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                          msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        // Command പേര് കറക്റ്റ് ആണോ എന്ന് ഉറപ്പാക്കുന്നു
        const type = cmd || "kiss"; 
        
        await sock.sendMessage(jid, { react: { text: "💞", key: msg.key } });

        try {
            const apiUrl = `https://jerrycoder.oggyapi.workers.dev/anime/${type}?json=false`;
            
            // നേരിട്ട് URL കൊടുക്കുന്നതിന് പകരം ബഫർ ആയി എടുക്കുന്നു (ഇതാകുമ്പോൾ എറർ വന്നാൽ നമുക്ക് തന്നെ പിടിക്കാം)
            const response = await axios.get(apiUrl, { 
                responseType: 'arraybuffer',
                timeout: 10000 
            });

            // ഇമേജ് അയക്കുന്നു
            await sock.sendMessage(jid, { 
                image: Buffer.from(response.data),
                caption: mentioned ? `@${mentioned.split('@')} you got a ${type} from the user!` : `Here is a ${type} for you!`,
                mentions: mentioned ? [mentioned] : []
            }, { quoted: msg });

        } catch (err) {
            console.error("Anime API Error:", err.message);
            // ഇവിടെയാണ് എറർ ഹാൻഡ്‌ലിംഗ്, 404 വന്നാൽ ബോട്ട് ക്രാഷ് ആവില്ല
            await sock.sendMessage(jid, { text: "❌ *Could not fetch that animation! (API might be down)*" }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};