const axios = require('axios');

module.exports = {
    name: 'makeimg',
    alias: ['ai', 'pollai', 'generate'],
    category: 'ai',
    description: 'Generate AI image from text prompt',
    usage: `.makeimg <prompt>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prompt = args.join(' ').trim();

        if (!prompt) {
            return sock.sendMessage(jid, {
                text: `❌ *Missing Prompt*\n\n➤ Example: .makeimg beautiful princess girl`
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🎨 _Generating image..._` }, { quoted: msg });

        try {
            let imageUrl = null;
            
            // 🔥 നല്ല റേഷ്യോ കിട്ടാൻ Flux API ആദ്യം വെച്ചു, Backup ആയി നിന്റെ Poll API-യും വെച്ചു
            const apis = [
                `https://eliteprotech-apis.zone.id/flux?prompt=${encodeURIComponent(prompt)}`,
                `https://jerrycoder.oggyapi.workers.dev/ai/poll?prompt=${encodeURIComponent(prompt)}`
            ];

            for (const api of apis) {
                if (imageUrl) break;
                
                let retries = 2; // ഓരോ API-ക്കും 2 ട്രൈ വെച്ച് കൊടുക്കുന്നു
                while (retries > 0) {
                    try {
                        const { data } = await axios.get(api, { timeout: 30000 });
                        
                        if (typeof data === 'string' && data.startsWith('http')) {
                            imageUrl = data;
                        } else {
                            imageUrl = data?.result?.url || data?.result?.image || data?.data?.url || data?.data?.image || data?.url || data?.image || data?.result;
                        }

                        if (imageUrl && String(imageUrl).startsWith('http')) break;
                        imageUrl = null;
                    } catch (e) {
                        console.log(`MakeImg API error:`, e.message);
                    }
                    retries--;
                    if (retries > 0) await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (!imageUrl) throw new Error("Failed to generate image from all APIs.");

            // ❌ വാട്ടർമാർക്ക് ഒഴിവാക്കി ക്ലീൻ ക്യാപ്ഷൻ ആക്കി
            await sock.sendMessage(jid, {
                image: { url: imageUrl },
                caption: `🎨 *AI IMAGE*\n\n📝 Prompt: ${prompt}`
            }, { quoted: msg });

            // ലോഡിങ് മെസ്സേജ് ഡിലീറ്റ് ചെയ്യുന്നു
            try {
                await sock.sendMessage(jid, { delete: statusMsg.key });
            } catch {}

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("AI Image Error:", err.message);
            
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            
            // സിമ്പിൾ എറർ മെസ്സേജ്
            await sock.sendMessage(jid, { text: `❌ Something went wrong, please try again later.` }, { quoted: msg });
            
            try {
                await sock.sendMessage(jid, { delete: statusMsg.key });
            } catch {}
        }
    }
};