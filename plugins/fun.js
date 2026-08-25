const axios = require('axios');

module.exports = {
    name: 'fun',
    // ഈ ഒറ്റ ഫയലിലേക്ക് തന്നെ എല്ലാ കമാൻഡുകളും വരാൻ വേണ്ടി അപരനാമങ്ങൾ സെറ്റ് ചെയ്തു 
    alias: ['meme', 'memes', 'fact', 'facts', 'question', 'questions', 'slot', 'slots', 'spin'],
    category: 'fun',
    description: 'KIRA Fun Hub (Memes, Facts, Questions, Slots)',
    usage: '.meme / .fact / .question / .slot',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        
        const text = msg.message?.conversation || msg.message?.imageMessage?.caption || msg.message?.extendedTextMessage?.text || "";
        const prefix = process.env.PREFIX || '.';
        
        const cmdName = text.trim().split(/ +/).shift().toLowerCase();
        const action = cmdName.startsWith(prefix) ? cmdName.slice(prefix.length) : cmdName;

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            // ─── 1. MEME ───
            if (action === 'meme' || action === 'memes') {
                const res = await axios.get('https://abhi-api.vercel.app/api/fun/meme?nsfw=false', { responseType: 'arraybuffer', timeout: 20000 });
                const contentType = res.headers['content-type'] || '';
                
                let imageBuffer;
                let captionText = `😂 *Here is your Meme!*`;

                if (contentType.includes('application/json')) {
                    const json = JSON.parse(res.data.toString('utf-8'));
                    const resultObj = json.result || {};
                    let mediaUrl = resultObj.meme_url || json.url || json.image;
                    const title = resultObj.title || json.title;
                    
                    if (title) captionText = `😂 *${title}*`;
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

                await sock.sendMessage(jid, { text: `🧠 *Did you know?*\n\n${factText}` }, { quoted: msg });
            }

            // ─── 3. QUESTION ───
            else if (action === 'question' || action === 'questions') {
                const res = await axios.get('https://abhi-api.vercel.app/api/fun/question', { timeout: 15000 });
                const data = res.data;
                const resultObj = data.result || {};
                const questionText = resultObj.question || data.question || data.text || (typeof data === 'string' ? data : "Could not fetch a question.");

                await sock.sendMessage(jid, { text: `🤔 *Question for you!*\n\n${questionText}` }, { quoted: msg });
            }

            // ─── 4. SLOTS GAME ───
            else if (action === 'slot' || action === 'slots' || action === 'spin') {
                const res = await axios.get('https://abhi-api.vercel.app/api/games/slots', { timeout: 15000 });
                const data = res.data;
                
                const resultObj = data.result || {};
                const slotDisplay = resultObj.slotDisplay || "🎰 Error loading slots";
                const resultMessage = resultObj.resultMessage || "";

                const formatMsg = `${slotDisplay.trim()}\n\n${resultMessage}`;
                await sock.sendMessage(jid, { text: formatMsg.trim() }, { quoted: msg });
            }

            // ─── 5. FALLBACK / MENU (ഇതാണ് നമ്മൾ പുതുതായി ചേർത്തത്) ───
            else {
                const menuMsg = `🎮 *KIRA FUN HUB* 🎮\n\n` +
                                `_Try these commands:_\n\n` +
                                `🔹 *.meme* - Get a random meme\n` +
                                `🔹 *.fact* - Get a random fact\n` +
                                `🔹 *.question* - Get a random question\n` +
                                `🔹 *.slot* - Spin the slot machine`;
                await sock.sendMessage(jid, { text: menuMsg }, { quoted: msg });
            }

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("Fun Plugin Error:", err.message);
            
            // ❌ ഫെയിൽ ആയാൽ എറർ റിയാക്ഷനും ക്ലീൻ മെസ്സേജും
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: '❌ API is currently down or not responding. Please try again later.' }, { quoted: msg });
        }
    }
};
