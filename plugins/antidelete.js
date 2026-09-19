const { getSettings, updateSetting } = require("../lib/database");

module.exports = {
    name: "antidelete",
    alias: ["ad"],
    category: "owner",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        if (!isOwner) return sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg });

        const botNumber = sock.user.id.split(":")[0].replace(/[^0-9]/g, "");
        const settings = getSettings(botNumber);

        let chats = settings.antiDeleteChats || [];
        let modes = settings.antiDeleteMode || {}; 
        
        const action = (args[0] || "").toLowerCase();
        const mode = (args[1] || "pm").toLowerCase(); // default sends to PM

        if (action === "on") {
            if (!chats.includes(jid)) {
                chats.push(jid);
                updateSetting(botNumber, "antiDeleteChats", chats);
            }
            
            if (["chat", "pm"].includes(mode)) {
                modes[jid] = mode;
                updateSetting(botNumber, "antiDeleteMode", modes);
            }

            const targetText = mode === "chat" ? "This Group" : "Owner's PM";
            return sock.sendMessage(jid, { 
                text: `✅ *AntiDelete Enabled*\nDeleted messages will be forwarded to: *${targetText}*` 
            }, { quoted: msg });
        }

        if (action === "off") {
            chats = chats.filter(id => id !== jid);
            updateSetting(botNumber, "antiDeleteChats", chats);
            
            delete modes[jid];
            updateSetting(botNumber, "antiDeleteMode", modes);

            return sock.sendMessage(jid, { text: "❌ *AntiDelete disabled.*" }, { quoted: msg });
        }

        return sock.sendMessage(jid, {
            text: `🛡️ *AntiDelete Settings*\n\n.antidelete on pm\n_(Sends deleted msg to owner)_\n\n.antidelete on chat\n_(Sends deleted msg back to this chat)_\n\n.antidelete off`
        }, { quoted: msg });
    }
};
