const axios = require('axios');

module.exports = {
    name: 'aistory',
    alias: ['story', 'makestory'],
    category: 'ai',
    description: 'Generate an AI story based on a prompt',
    usage: '.aistory <topic>',
    
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prompt = args.join(' ').trim();

        if (!prompt) {
            return await sock.sendMessage(jid, { 
                text: '⚠️ *Please provide a topic or theme!*\n_Example: .aistory horror_' 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

            // API Call
            const apiUrl = `https://eliteprotech-apis.zone.id/ai/story?text=${encodeURIComponent(prompt)}`;
            const res = await axios.get(apiUrl, { timeout: 30000 }); 

            if (!res.data || !res.data.success || !res.data.story) {
                throw new Error('Invalid response from AI Story API');
            }

            const storyText = res.data.story.trim();

            const finalMessage = `📖 *AI STORY GENERATOR*\n\n*Prompt:* ${prompt}\n\n${storyText}`;

            await sock.sendMessage(jid, { text: finalMessage }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error('AISTORY ERROR:', err.message);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { 
                text: '❌ Failed to generate story. Please try again later.' 
            }, { quoted: msg });
        }
    }
};