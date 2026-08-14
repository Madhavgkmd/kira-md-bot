const { getSettings, updateSetting } = require('../lib/database');

module.exports = {
    name: "antidelete",
    alias: ["ad"],
    category: "owner",

    async execute(sock, msg, args, isOwner) { // isOwner ആഡ് ചെയ്തു
        const jid = msg.key.remoteJid;
        
        // 🔥 OWNER CHECK
        if (!isOwner) {
            return sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg });
        }
        
        const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        const config = getSettings(botNumber);
        
        let antiDeleteChats = config.antiDeleteChats || [];
        const action = (args[0] || "").toLowerCase();

        if (action === "on") {
            if (!antiDeleteChats.includes(jid)) {
                antiDeleteChats.push(jid);
                updateSetting(botNumber, "antiDeleteChats", antiDeleteChats);
            }
            return sock.sendMessage(jid, {
                text: "✅ AntiDelete Enabled (For this bot)"
            }, { quoted: msg });
        }

        if (action === "off") {
            antiDeleteChats = antiDeleteChats.filter(x => x !== jid);
            updateSetting(botNumber, "antiDeleteChats", antiDeleteChats);

            return sock.sendMessage(jid, {
                text: "❌ AntiDelete Disabled (For this bot)"
            }, { quoted: msg });
        }

        return sock.sendMessage(jid, {
            text: `*ANTI DELETE*\n\n.antidelete on\n.antidelete off`
        }, { quoted: msg });
    }
};