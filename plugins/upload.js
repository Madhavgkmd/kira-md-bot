const fs = require('fs');
const path = require('path');

module.exports = {
    name: "upload",
    alias: ["dlurl"],
    category: "utility",
    description: "Download file from URL and send as document",
    usage: `${process.env.PREFIX || '.'}upload <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        if (!url) return await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

        try {
            const response = await fetch(url);
            const buffer = Buffer.from(await response.arrayBuffer());
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            const fileName = path.basename(new URL(url).pathname) || 'downloaded_file';
            const outputPath = path.join(tempDir, fileName);
            
            fs.writeFileSync(outputPath, buffer);
            
            await sock.sendMessage(jid, { 
                document: fs.readFileSync(outputPath), 
                mimetype: 'application/octet-stream', 
                fileName: fileName 
            });
            
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            fs.unlinkSync(outputPath); // അയച്ച ശേഷം ഫയൽ ഡിലീറ്റ് ചെയ്യും
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};