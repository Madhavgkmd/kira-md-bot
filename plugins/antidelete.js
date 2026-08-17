const { getSettings, updateSetting } = require("../lib/database");

module.exports = {
    name: "antidelete",
    alias: ["ad"],
    category: "owner",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(
                jid,
                { text: "❌ Owner only command!" },
                { quoted: msg }
            );
        }

        const botNumber = sock.user.id
            .split(":")[0]
            .replace(/[^0-9]/g, "");

        const settings = getSettings(botNumber);

        let chats = settings.antiDeleteChats || [];
        const action = (args[0] || "").toLowerCase();

        // ON
        if (action === "on") {
            if (!chats.includes(jid)) {
                chats.push(jid);
                updateSetting(botNumber, "antiDeleteChats", chats);
            }

            return sock.sendMessage(
                jid,
                { text: "✅ AntiDelete enabled." },
                { quoted: msg }
            );
        }

        // OFF
        if (action === "off") {
            chats = chats.filter(id => id !== jid);

            updateSetting(botNumber, "antiDeleteChats", chats);

            return sock.sendMessage(
                jid,
                { text: "❌ AntiDelete disabled." },
                { quoted: msg }
            );
        }

        // HELP
        return sock.sendMessage(
            jid,
            {
                text:
`🛡️ *AntiDelete*

.antidelete on
.antidelete off`
            },
            { quoted: msg }
        );
    }
};