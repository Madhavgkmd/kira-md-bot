const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
    name: "gstatus",
    alias: ["groupstatus"],
    category: "owner",
    description: "Uploads replied media to bot's status",
    usage: ".gstatus (reply to media)",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        // Owner ആണോ എന്ന് ചെക്ക് ചെയ്യുന്നു
        if (!isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Only for owners!*" }, { quoted: msg });
        }

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // മീഡിയ റീപ്ലൈ ഉണ്ടോ എന്ന് നോക്കുന്നു
        if (!quoted) {
            return await sock.sendMessage(jid, { text: "⚠️ *Please reply to an image or video to post as status!*" }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            // മീഡിയ ഡൗൺലോഡ് ചെയ്യുന്നു
            const mediaBuffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, {});
            const type = Object.keys(quoted)[0]; // imageMessage or videoMessage

            // സ്റ്റാറ്റസിലേക്ക് അയക്കുന്നു (status@broadcast)
            await sock.sendMessage("status@broadcast", {
                [type === "imageMessage" ? "image" : "video"]: mediaBuffer,
                caption: args.join(" ") || ""
            });

            await sock.sendMessage(jid, { text: "✅ *Media successfully uploaded to your status!*" }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "✨", key: msg.key } });

        } catch (err) {
            console.log("STATUS UPLOAD ERROR:", err);
            await sock.sendMessage(jid, { text: "❌ *Failed to upload status.*" }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};