const axios = require('axios');

module.exports = {
    name: 'makeimg',
    alias: ['ai', 'pollai', 'generate'],
    category: 'ai',
    description: 'Generate AI image from text prompt',
    usage: `${process.env.PREFIX || '.'}makeimg <prompt>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prompt = args.join(' ').trim();

        if (!prompt) {
            return sock.sendMessage(jid, {
                text: `❌ *Missing Prompt*\n\n➤ Example: ${process.env.PREFIX || '.'}makeimg beautiful princess girl`
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🎨 *Generating image for:* "${prompt}"...` });

        try {
            const apiUrl = `https://jerrycoder.oggyapi.workers.dev/ai/poll?prompt=${encodeURIComponent(prompt)}`;

            // API ഡയറക്റ്റ് ഇമേജ് ആണോ അതോ JSON ആണോ എന്ന് നോക്കാൻ arraybuffer ഉപയോഗിക്കുന്നു
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
            let imageBuffer = response.data;

            // ചിലപ്പോൾ API ഒരു JSON ആയിരിക്കും തരുന്നത് (ഉദാഹരണത്തിന്: { url: "..." })
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                const json = JSON.parse(imageBuffer.toString('utf8'));
                const imageUrl = json.url || json.result || json.image || json.data;
                if (imageUrl) {
                    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    imageBuffer = imgRes.data;
                } else {
                    throw new Error("No image found in API response");
                }
            }

            // ഫോട്ടോ മെസ്സേജ് ആയി അയക്കുന്നു
            await sock.sendMessage(jid, {
                image: imageBuffer,
                caption: `🎨 *Prompt:* ${prompt}\n\n> *${global.config?.BOT_NAME || 'KIRA X MD'}*`
            }, { quoted: msg });

            // ലോഡിങ് മെസ്സേജ് അപ്ഡേറ്റ് ചെയ്യുന്നു
            await sock.sendMessage(jid, { text: "✅ *Image Generated Successfully*", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("AI Image Error:", err.message);
            await sock.sendMessage(jid, { text: `❌ *Failed to generate image*\nTry again later.`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};