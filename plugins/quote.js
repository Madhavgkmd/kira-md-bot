const axios = require('axios');

module.exports = {
    name: 'quote',
    alias: ['quotes', 'qotd'],
    category: 'fun',
    description: 'Get a random inspirational quote',
    usage: `${process.env.PREFIX || '.'}quote`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const apiUrl = 'https://www.movanest.xyz/v2/quote';
            const res = await axios.get(apiUrl, { timeout: 10000 });

            // API തരുന്ന 10 റിസൾട്ടുകളുടെ ലിസ്റ്റ് (Array) എടുക്കുന്നു
            const results = res.data?.results;

            if (!results || results.length === 0) {
                throw new Error("No quotes found in the API response");
            }

            // ആ 10 കോട്ടുകളിൽ നിന്ന് Random ആയി ഒരെണ്ണം തിരഞ്ഞെടുക്കുന്നു
            const randomIndex = Math.floor(Math.random() * results.length);
            const selectedQuote = results[randomIndex];

            const quoteText = selectedQuote?.quote || selectedQuote?.text;
            const author = selectedQuote?.author || "Unknown";

            if (!quoteText) throw new Error("Could not extract quote text.");

            // 💬 കിടിലൻ ഫോർമാറ്റിൽ മെസ്സേജ് ഡിസൈൻ ചെയ്യുന്നു
            const formatMsg = `💬 *${quoteText}*\n\n~ _${author}_\n\n> *${global.config?.BOT_NAME || 'KIRA X MD'}*`;

            // മെസ്സേജ് അയക്കുന്നു
            await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Quote Error:", err.message);
            // ❌ എറർ വന്നാൽ യൂസറെ അറിയിക്കുന്നു
            await sock.sendMessage(jid, { text: `❌ *Failed to fetch quote!* Try again later.` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};