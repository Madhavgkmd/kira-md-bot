module.exports = {
    name: "ping",

    async execute(sock, msg) {
        // ⏳ പെട്ടെന്ന് ലോഡിംഗ് റിയാക്ഷൻ ഇടുന്നു
        await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚡", key: msg.key } });

        const start = Date.now();

        const sent = await sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "⚡ Calculating..."
            },
            { quoted: msg }
        );

        const latency = Date.now() - start;

        // 🔥 ബോട്ട് പേര് ഒഴിവാക്കി ബോൾഡ് & ഇറ്റാലിക് ഫോർമാറ്റിൽ റിപ്ലൈ ആയി വരുന്നു
        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text: `_*⚡ Latency: ${latency}ms*_`,
                edit: sent.key
            },
            { quoted: msg }
        );
    }
};