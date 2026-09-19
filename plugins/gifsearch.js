const axios = require("axios");

module.exports = {
    name: "gifsearch",
    alias: ["searchgif", "giphy"],
    category: "search",
    description: "Search for GIFs using Giphy API",
    usage: ".gifsearch <query>", 

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(jid, { 
                text: `❌ *What GIF do you want to search?*\nExample: .gifsearch iron man` 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

            const apiKey = "myagxm9fUMzQKZYIyjX3qu48X3Abrxqc";
            
            // 🚨 FIX: 1 റിസൾട്ടിന് പകരം 5 എണ്ണം എടുക്കുന്നു, എങ്കിലേ MP4 തപ്പി കണ്ടുപിടിക്കാൻ പറ്റൂ 🚨
            const res = await axios.get(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=5`, { timeout: 15000 });

            if (!res.data || !res.data.data || res.data.data.length === 0) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(jid, { 
                    text: `❌ *No GIFs found for "${query}"*` 
                }, { quoted: msg });
            }

            let gifUrl = '';
            let isMp4 = false;

            // 5 റിസൾട്ടുകളിൽ എവിടെയെങ്കിലും MP4 ഉണ്ടോ എന്ന് ചെക്ക് ചെയ്യുന്നു
            for (const item of res.data.data) {
                const imgs = item.images;
                if (imgs) {
                    const mp4Link = imgs.original?.mp4 || imgs.downsized_small?.mp4 || imgs.fixed_height?.mp4;
                    if (mp4Link) {
                        gifUrl = mp4Link;
                        isMp4 = true;
                        break; // MP4 കിട്ടിയാൽ ലൂപ്പ് നിർത്തും
                    }
                }
            }

            // 5 എണ്ണത്തിലും MP4 ഇല്ലെങ്കിൽ, ആദ്യത്തെ ഒബ്ജക്റ്റിലെ സാധാരണ .gif URL എടുക്കും
            if (!gifUrl && res.data.data.images?.original?.url) {
                gifUrl = res.data.data.images.original.url;
            }

            if (!gifUrl) throw new Error("Could not find any playable media for this search.");

            if (isMp4) {
                // MP4 ആണെങ്കിൽ WhatsApp GIF ആയി പ്ലേ ആവും
                await sock.sendMessage(jid, {
                    video: { url: gifUrl },
                    gifPlayback: true, 
                    caption: `*GIPHY:* ${query}`
                }, { quoted: msg });
            } else {
                // MP4 ഇല്ലെങ്കിൽ സാധാരണ Image ആയി അയക്കും (എറർ വരാതിരിക്കാൻ)
                await sock.sendMessage(jid, {
                    image: { url: gifUrl },
                    caption: `*GIPHY:* ${query}\n_(MP4 format not available for this GIF)_`
                }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Giphy Search Error:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { 
                text: `╭──『 ❌ *ERROR* 』──⊷\n│ Failed to fetch GIF.\n│ ${err.message}\n╰──────────────⊷` 
            }, { quoted: msg });
        }
    }
};