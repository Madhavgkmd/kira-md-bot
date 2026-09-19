const axios = require('axios');

module.exports = {
    name: 'quote',
    alias: ['quotes', 'qotd'],
    category: 'fun',
    description: 'Get a random inspirational quote',
    usage: '.quote',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const apiUrl = 'https://www.movanest.xyz/v2/quote';
            const res = await axios.get(apiUrl, { timeout: 15000 });

            // API തരുന്ന റിസൾട്ടുകളുടെ ലിസ്റ്റ് (Array) എടുക്കുന്നു
            const results = res.data?.results;

            if (!results || results.length === 0) {
                throw new Error("No quotes found in the API response");
            }

            // റിസൾട്ടുകളിൽ നിന്ന് Random ആയി ഒരെണ്ണം തിരഞ്ഞെടുക്കുന്നു
            const randomIndex = Math.floor(Math.random() * results.length);
            const selectedQuote = results[randomIndex];

            const quoteText = selectedQuote?.quote || selectedQuote?.text;
            const author = selectedQuote?.author || "Unknown";

            if (!quoteText) throw new Error("Could not extract quote text.");

            // 💬 വാട്ടർമാർക്ക് ഇല്ലാതെ ക്ലീൻ ആയി മെസ്സേജ് ഫോർമാറ്റ് ചെയ്യുന്നു
            const formatMsg = `💬 *"${quoteText}"*\n\n~ _${author}_`;

            // മെസ്സേജ് അയക്കുന്നു
            await sock.sendMessage(jid, { text: formatMsg }, { quoted: msg });

            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("QUOTE ERROR:", err.message);
            
            // ❌ എറർ റിയാക്ഷനും സ്മൂത്ത് എറർ മെസ്സേജും
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ Something went wrong, please try again later.` }, { quoted: msg });
        }
    }
};