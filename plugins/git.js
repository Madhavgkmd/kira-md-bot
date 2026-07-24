module.exports = {
    name: "git",
    alias: ["repo", "github"],

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const text = `
╔══════════════════════════╗
   ⚡ *KIRA X MD - REPO* ⚡
╚══════════════════════════╝

💠 *GitHub Repository*
📂 https://github.com/Madhavgkmd/kira-md-bot

🤖 *Session Generator API*
🌐 https://kira-session-generator-api.onrender.com

💬 *Support Community*
🔗 https://chat.whatsapp.com/BRVbzKlfHv66pSeea7H1hS

━━━━━━━━━━━━━━━━━━━━
✨ *KIRA X MD* | _Powered by KIRA X MD_
⭐ *Don't forget to Star & Fork!*
🚀 *Keep coding, keep evolving.*
━━━━━━━━━━━━━━━━━━━━
`;

        await sock.sendMessage(
            jid,
            { 
                text,
                contextInfo: {
                    externalAdReply: {
                        title: "KIRA X MD - OFFICIAL REPO",
                        body: "Get the latest updates here",
                        thumbnailUrl: "https://files.catbox.moe/kriz_logo.jpg", // നിന്റെ ലോഗോ ലിങ്ക് ഇവിടെ നൽകുക
                        mediaType: 1,
                        mediaUrl: "https://github.com/Madhavgkmd/kira-md-bot",
                        sourceUrl: "https://github.com/Madhavgkmd/kira-md-bot"
                    }
                }
            },
            { quoted: msg }
        );
    }
};