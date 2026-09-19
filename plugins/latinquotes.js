const axios = require("axios");

module.exports = {
    name: "latinquotes",
    alias: ["latin", "lquote", "latinquote"],
    category: "fun",
    description: "Get a random Latin quote with its meaning",
    usage: `${process.env.PREFIX || '.'}latinquotes`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;

        // Loading Reaction
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const { data } = await axios.get("https://kiraxmd-api.vercel.app/api/latin");

            const quoteObj = data.result || (Array.isArray(data) ? data[Math.floor(Math.random() * data.length)] : data);
            
            const latinText = quoteObj.latin || quoteObj.quote || quoteObj.text || "Unknown Latin Quote";
            const meaningText = quoteObj.meaning || quoteObj.translation || quoteObj.english || "No Meaning Available";

            // Clean Minimalist Format
            const quoteMsg = `📜 *"${latinText}"*\n— ${meaningText}`;

            // Send Message & Success Reaction
            await sock.sendMessage(jid, { text: quoteMsg }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error("Latin Quote API Error:", error.message);
            
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { 
                text: "❌ *Failed to fetch quote! The API server might be down or busy.*" 
            }, { quoted: msg });
        }
    }
};
