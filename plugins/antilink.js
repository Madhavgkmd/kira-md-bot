// plugins/antilink.js – KIRA X MD (Owner only)
const { getSettings, updateSetting } = require('../lib/database');

module.exports = {
    name: "antilink",
    alias: ["alink"],
    category: "owner",
    description: "Manage Anti-Link (Owner Only)",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg });
        }

        if (!jid.endsWith("@g.us")) {
            return sock.sendMessage(jid, { text: "❌ *Group only!*" }, { quoted: msg });
        }

        const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        const config = getSettings(botNumber);

        let antilinkChats = config.antilinkChats || [];
        let antilinkMode = config.antilinkMode || {};

        const action = (args[0] || "").toLowerCase();
        const mode = (args[1] || "delete").toLowerCase();

        if (action === "on") {
            if (!["warn", "delete", "kick"].includes(mode)) {
                return sock.sendMessage(jid, {
                    text: `❌ Invalid mode!\n\nExamples:\n.antilink on warn\n.antilink on delete\n.antilink on kick`
                }, { quoted: msg });
            }

            if (!antilinkChats.includes(jid)) {
                antilinkChats.push(jid);
                updateSetting(botNumber, "antilinkChats", antilinkChats);
            }

            antilinkMode[jid] = mode;
            updateSetting(botNumber, "antilinkMode", antilinkMode);

            return sock.sendMessage(jid, {
                text: `✅ *AntiLink Enabled*\nMode: ${mode.toUpperCase()}\n\nBot must be admin for kick mode.`
            }, { quoted: msg });
        }

        if (action === "off") {
            antilinkChats = antilinkChats.filter(x => x !== jid);
            updateSetting(botNumber, "antilinkChats", antilinkChats);

            delete antilinkMode[jid];
            updateSetting(botNumber, "antilinkMode", antilinkMode);

            return sock.sendMessage(jid, {
                text: "❌ *AntiLink Disabled*"
            }, { quoted: msg });
        }

        const status = antilinkChats.includes(jid) ? `ON (${antilinkMode[jid] || 'delete'})` : "OFF";
        return sock.sendMessage(jid, {
            text: `╭━━━〔 ANTILINK 〕━━━⬣\n\nStatus: ${status}\n\n.antilink on [warn/delete/kick]\n.antilink off\n\n╰━━━━━━━━━━━━━━⬣`
        }, { quoted: msg });
    }
};