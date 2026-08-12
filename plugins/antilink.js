const { getSettings, updateSetting } = require('../lib/database');

module.exports = {
    name: "antilink",
    alias: ["alink"],
    category: "owner",
    description: "Manage Anti-Link (Owner Only)",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        // 🔥 Admin പെർമിഷൻ ഒഴിവാക്കി. വെറും Owner-ന് മാത്രം!
        if (!isOwner) {
            return sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg });
        }

        if (!jid.endsWith("@g.us")) {
            return sock.sendMessage(jid, { text: "❌ Group only command!" }, { quoted: msg });
        }

        const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        const config = getSettings(botNumber);

        let antilinkChats = config.antilinkChats || [];
        let antilinkMode = config.antilinkMode || {};

        const action = (args[0] || "").toLowerCase();
        const mode = (args[1] || "delete").toLowerCase();

        // .antilink on
        if (action === "on") {
            if (!["warn", "delete", "kick"].includes(mode)) {
                return sock.sendMessage(jid, {
                    text: `❌ Invalid mode!\n\nExample:\n.antilink on warn\n.antilink on delete\n.antilink on kick`
                }, { quoted: msg });
            }

            if (!antilinkChats.includes(jid)) {
                antilinkChats.push(jid);
                updateSetting(botNumber, "antilinkChats", antilinkChats);
            }

            antilinkMode[jid] = mode;
            updateSetting(botNumber, "antilinkMode", antilinkMode);

            return sock.sendMessage(jid, {
                text: `✅ AntiLink Enabled (For this bot)\n\nMode: ${mode.toUpperCase()}`
            }, { quoted: msg });
        }

        // .antilink off
        if (action === "off") {
            antilinkChats = antilinkChats.filter(x => x !== jid);
            updateSetting(botNumber, "antilinkChats", antilinkChats);

            delete antilinkMode[jid];
            updateSetting(botNumber, "antilinkMode", antilinkMode);

            return sock.sendMessage(jid, {
                text: "❌ AntiLink Disabled (For this bot)"
            }, { quoted: msg });
        }

        return sock.sendMessage(jid, {
            text: `╭━━━〔 ANTILINK 〕━━━⬣\n\n.antilink on\n.antilink on warn\n.antilink on delete\n.antilink on kick\n.antilink off\n\n╰━━━━━━━━━━━━━━⬣`
        }, { quoted: msg });
    }
};