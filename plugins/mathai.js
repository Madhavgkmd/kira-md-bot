const axios = require('axios');

module.exports = {
    name: 'mathai',
    alias: ['math', 'mathgpt'],
    category: 'ai',
    description: 'Solve math problems with step-by-step explanations',
    usage: '.mathai <math problem>',
    
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(jid, { 
                text: '⚠️ *Please provide a math problem!*\n_Example: .mathai 2x + 5 = 15_' 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

            // API Call
            const apiUrl = `https://eliteprotech-apis.zone.id/ai/mathgpt?q=${encodeURIComponent(query)}`;
            const res = await axios.get(apiUrl, { timeout: 30000 }); 

            if (!res.data || !res.data.status || !res.data.raw || !res.data.raw.content) {
                throw new Error('Invalid response from MathAI API');
            }

            // raw.content ആണ് നമ്മൾ മെസ്സേജ് ആയി അയക്കുന്നത് (അതിൽ ബോൾഡ് ഫോർമാറ്റ് ഒക്കെ ഉണ്ടാകും)
            const answerText = res.data.raw.content.trim();

            const finalMessage = `🧮 *MATH AI*\n\n*Q:* ${query}\n\n${answerText}`;

            await sock.sendMessage(jid, { text: finalMessage }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error('MATHAI ERROR:', err.message);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { 
                text: '❌ Failed to solve the math problem. Please try again later.' 
            }, { quoted: msg });
        }
    }
};