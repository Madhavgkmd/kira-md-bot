const axios = require('axios');

module.exports = {
    name: 'fun',
    // പുതിയതായി 'slot', 'slots', 'spin' എന്നിവ കൂടി ചേർത്തിട്ടുണ്ട് 
    alias: ['meme', 'memes', 'fact', 'facts', 'question', 'questions', 'slot', 'slots', 'spin'],
    category: 'fun',
    description: 'KIRA Fun Hub (Memes, Facts, Questions, Slots)',
    usage: `${process.env.PREFIX || '.'}meme / .fact / .question / .slot`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        
        const text = msg.message?.conversation || msg.message?.imageMessage?.caption || msg.message?.extendedTextMessage?.text || "";
        const prefix = process.env.PREFIX || '.';
        
        const cmdName = text.trim().split(/ +/).shift().toLowerCase();
        const action = cmdName.startsWith(prefix) ? cmdName.slice(prefix.length) : cmdName;

        // 🔥 Dynamic Bot Name
        const botName = global.config?.BOT_NAME || process.env.BOT_NAME || 'KIRA X MD';

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            // ─── 1. MEME ───
            if (action === 'meme' || action === 'memes') {
                const res = await axios.get('https://abhi-api.vercel.app/api/fun/meme?nsfw=false', { responseType: 'arraybuffer', timeout: 20000 });
                const contentType = res.headers['content-type'] || '';
                
                let imageBuffer;
                let captionText = `😂 *Here is your Meme!*\n\n> *${botName}*`;

                if (contentType.includes('application/json')) {
                    const json = JSON.parse(res.data.toString('utf-8'));
                    const resultObj = json.result || {};
                    let mediaUrl = resultObj.meme_url || json.url || json.image;
                    const title = resultObj.title || json.title;
                    
                    if (title) captionText = `😂 *${title}*\n\n> *${botName}*`;
                    if (!mediaUrl) throw new Error("Could not extract meme URL.");

                    const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 20000 });
                    imageBuffer = mediaRes.data;
                } else {
                    imageBuffer = res.data;
                }

                await sock.sendMessage(jid, { image: imageBuffer, caption: captionText }, { quoted: msg });
            }

            // ─── 2. FACTS ───
            else if (action === 'fact' || action === 'facts') {
                const res = await axios.get('https://abhi-api.vercel.app/api/fun/facts', { timeout: 15000 });
                const data = res.data;
                const resultObj = data.result || {};
                const factText = resultObj.fact || data.fact || data.text || (typeof data === 'string' ? data : "Could not fetch a fact.");

                const formatMsg = `🧠 *Did you know?*\n\n${factText}\n\n> *${botName}*`;
                await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });
            }

            // ─── 3. QUESTION ───
            else if (action === 'question' || action === 'questions') {
                const res = await axios.get('https://abhi-api.vercel.app/api/fun/question', { timeout: 15000 });
                const data = res.data;
                const resultObj = data.result || {};
                const questionText = resultObj.question || data.question || data.text || (typeof data === 'string' ? data : "Could not fetch a question.");

                const formatMsg = `🤔 *Question for you!*\n\n${questionText}\n\n> *${botName}*`;
                await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });
            }

            // ─── 4. SLOTS GAME ───
            else if (action === 'slot' || action === 'slots' || action === 'spin') {
                const res = await axios.get('https://abhi-api.vercel.app/api/games/slots', { timeout: 15000 });
                const data = res.data;
                
                // റിസൾട്ടിൽ നിന്നും ഗെയിം ഡാറ്റ എടുക്കുന്നു
                const resultObj = data.result || {};
                const slotDisplay = resultObj.slotDisplay || "🎰 Error loading slots";
                const resultMessage = resultObj.resultMessage || "";

                // സ്പേസുകൾ കളഞ്ഞ് നല്ല ഭംഗിയായി മെസ്സേജ് ഒരുക്കുന്നു
                const formatMsg = `${slotDisplay.trim()}\n\n${resultMessage}\n\n> *${botName}*`;
                await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });
            }

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("Fun Plugin Error:", err.message);
            // ❌ ഫെയിൽ ആയാൽ എറർ റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
        }
    }
};