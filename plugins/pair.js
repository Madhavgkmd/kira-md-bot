const { startSubBot } = require("../lib/subbot");

const MAX_SUBBOTS = 8; // 🔥 Limit set to 8. You can change this number anytime.

module.exports = {
    name: 'pair',
    alias: ['jadibot', 'clone', 'subbot'],
    category: 'utility',
    description: 'Connect your number as a sub-bot',
    usage: `${process.env.PREFIX || '.'}pair 919876543210`,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        // Owner only command to prevent abuse
        if (!isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *owner only command!*" }, { quoted: msg });
        }

        // 🔥 CHECKING SUBBOT LIMIT
        const currentSubbots = Object.keys(global.subBots || {}).length;
        if (currentSubbots >= MAX_SUBBOTS) {
            return await sock.sendMessage(jid, { 
                text: `❌ *server full! maximum limit of ${MAX_SUBBOTS} sub-bots reached on this panel.*` 
            }, { quoted: msg });
        }

        const number = args.join("").replace(/[^0-9]/g, "");

        if (!number) {
            return await sock.sendMessage(jid, { 
                text: `❌ *please provide a valid whatsapp number!*\n\n_Example: .pair 919876543210_` 
            }, { quoted: msg });
        }

        // Loading reaction
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            // Triggering the Subbot process
            await startSubBot(number, sock, jid, msg);
        } catch (error) {
            console.error("Pairing Error:", error);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { 
                text: "❌ *pairing failed. check panel console for errors.*" 
            }, { quoted: msg });
        }
    }
};