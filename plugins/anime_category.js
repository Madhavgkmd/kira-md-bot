const axios = require('axios');

module.exports = {
    name: 'anime', // മെനുവിൽ കാറ്റഗറി പേര് കാണിക്കാൻ
    // താഴെ കൊടുത്തിരിക്കുന്നതെല്ലാം മെനുവിൽ Anime കാറ്റഗറിയുടെ താഴെ കാണിക്കും!
    alias: ['astatus', 'couplepp', 'itori', 'itadori', 'itachi', 'loli', 'miku', 'naruto', 'nezuko'],
    category: 'anime',
    description: 'Direct Anime Media Commands',
    usage: `${process.env.PREFIX || '.'}itachi / .couplepp / .astatus`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        
        // യൂസർ ഏത് കമാൻഡ് ആണ് ടൈപ്പ് ചെയ്തത് എന്ന് മെസ്സേജിൽ നിന്നും വേർതിരിച്ചെടുക്കുന്നു
        const text = msg.message?.conversation || msg.message?.imageMessage?.caption || msg.message?.extendedTextMessage?.text || "";
        const prefix = process.env.PREFIX || '.';
        
        // കമാൻഡിന്റെ പേര് മാത്രം എടുക്കുന്നു (ഉദാഹരണത്തിന്: .itachi അടിച്ചാൽ "itachi" എന്ന് മാത്രം കിട്ടും)
        const cmdName = text.trim().split(/ +/).shift().toLowerCase();
        const action = cmdName.startsWith(prefix) ? cmdName.slice(prefix.length) : cmdName;

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            // ─── SMART PARSER FUNCTION ───
            const fetchMedia = async (url) => {
                const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 25000 });
                const contentType = res.headers['content-type'] || '';

                if (contentType.includes('application/json')) {
                    const json = JSON.parse(res.data.toString('utf-8'));
                    
                    if (url.includes('couplepp')) return json.result || json.data || json; 
                    
                    let mediaUrl = json.url || json.image || json.video || json.result || json.data?.url;
                    if (!mediaUrl) throw new Error("Could not extract media URL.");

                    const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 25000 });
                    return mediaRes.data;
                }
                return res.data; 
            };

            // ─── 1. ANIME STATUS ───
            if (action === 'astatus') {
                const videoBuffer = await fetchMedia('https://abhi-api.vercel.app/api/anime/astatus');
                await sock.sendMessage(jid, { 
                    video: videoBuffer, 
                    caption: `⛩️ *Anime Status*\n\n> *KIRA X MD*` 
                }, { quoted: msg });
            }

            // ─── 2. COUPLE DP ───
            else if (action === 'couplepp') {
                const data = await fetchMedia('https://abhi-api.vercel.app/api/anime/couplepp');
                
                let maleUrl = data.male || data.boy || data.m || data.result?.male;
                let femaleUrl = data.female || data.girl || data.f || data.result?.female;

                if (!maleUrl || !femaleUrl) throw new Error("Could not find matching DPs.");

                const maleBuffer = await axios.get(maleUrl, { responseType: 'arraybuffer' });
                const femaleBuffer = await axios.get(femaleUrl, { responseType: 'arraybuffer' });

                await sock.sendMessage(jid, { image: maleBuffer.data, caption: `👦 *Boy DP*\n> *KIRA X MD*` }, { quoted: msg });
                await sock.sendMessage(jid, { image: femaleBuffer.data, caption: `👧 *Girl DP*\n> *KIRA X MD*` }, { quoted: msg });
            }

            // ─── 3. RANDOM CHARACTERS ───
            else {
                // itadori എന്ന് അടിച്ചാലും itori എന്ന API ലേക്ക് പോകാൻ വേണ്ടി
                const apiEndpoint = (action === 'itadori') ? 'itori' : action;
                const charUrl = `https://abhi-api.vercel.app/api/anime/${apiEndpoint}`;
                const imageBuffer = await fetchMedia(charUrl);
                
                const charName = action.charAt(0).toUpperCase() + action.slice(1);
                await sock.sendMessage(jid, { 
                    image: imageBuffer, 
                    caption: `⛩️ *${charName}*\n\n> *KIRA X MD*` 
                }, { quoted: msg });
            }

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("Anime Plugin Error:", err.message);
            // ❌ ഫെയിൽ ആയാൽ എറർ റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
        }
    }
};