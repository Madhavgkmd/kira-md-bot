const axios = require('axios');

module.exports = {
    name: 'mediafire',
    alias: ['mf', 'mfdown'],
    category: 'downloader',
    description: 'Download files from MediaFire',
    usage: `${process.env.PREFIX || '.'}mediafire <url>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const url = args.join(' ').trim();

        // ലിങ്ക് കൊടുത്തിട്ടുണ്ടോ എന്നും അത് MediaFire ലിങ്ക് ആണോ എന്നും ചെക്ക് ചെയ്യുന്നു
        if (!url || !url.includes('mediafire.com')) {
            return sock.sendMessage(jid, {
                text: `❌ *Invalid or Missing URL*\n\n➤ Example: ${process.env.PREFIX || '.'}mediafire https://www.mediafire.com/file/...`
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Fetching MediaFire file...*` });

        try {
            // നീ തന്ന API-ലേക്ക് റിക്വസ്റ്റ് അയക്കുന്നു
            const apiUrl = `https://eliteprotech-apis.zone.id/mediafire?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            // API തരുന്ന JSON റിസൾട്ടിൽ നിന്നും ഡാറ്റ എടുക്കുന്നു
            const result = data?.data || data?.result || data;
            const downloadUrl = result?.url || result?.link || result?.download;
            
            // ഫയലിന്റെ പേരും സൈസും കിട്ടിയില്ലെങ്കിൽ ഡീഫോൾട്ട് പേര് കൊടുക്കുന്നു
            const fileName = result?.name || result?.title || result?.filename || 'MediaFire_Download';
            const fileSize = result?.size || result?.filesize || 'Unknown size';
            const mimeType = result?.mimetype || result?.mime || 'application/octet-stream';

            if (!downloadUrl) {
                throw new Error("Could not extract download link from API.");
            }

            // WhatsApp-ലേക്ക് ഡോക്യുമെന്റ് ആയി അയക്കുന്നു
            await sock.sendMessage(jid, {
                document: { url: downloadUrl },
                mimetype: mimeType,
                fileName: fileName,
                caption: `📄 *File:* ${fileName}\n⚖️ *Size:* ${fileSize}\n\n> *KIRA X MD*`
            }, { quoted: msg });

            // സക്സസ് മെസ്സേജ് അപ്ഡേറ്റ് ചെയ്യുന്നു
            await sock.sendMessage(jid, { text: "✅ *File Downloaded Successfully*", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("MediaFire Error:", err.message);
            await sock.sendMessage(jid, { text: `❌ *Download Failed*\nEnsure the link is valid or try again later.`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};