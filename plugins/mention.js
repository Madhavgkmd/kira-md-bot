module.exports = [
    // 1. TAG COMMAND (Hidden Mentions)
    {
        name: "tag",
        alias: ["hidetag"],
        category: "group",
        description: "Tag all members invisibly",
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;

            if (!isOwner) {
                return await sock.sendMessage(jid, { text: "❌ *Owner only command*" }, { quoted: msg });
            }
            if (!jid.endsWith("@g.us")) {
                return await sock.sendMessage(jid, { text: "❌ *Group only*" }, { quoted: msg });
            }

            const text = args.join(" ") || "📢 Attention Everyone";
            const meta = await sock.groupMetadata(jid);
            const members = meta.participants.map(x => x.id);

            // ലിസ്റ്റ് ഇല്ലാതെ മെസ്സേജ് മാത്രം അയക്കുന്നു, പക്ഷെ എല്ലാവർക്കും ടാഗ് പോകും
            await sock.sendMessage(jid, {
                text: text,
                mentions: members 
            }, { quoted: msg });
        }
    },

    // 2. TAGALL COMMAND (Visible List Mentions)
    {
        name: "tagall",
        alias: ["mentionall"],
        category: "group",
        description: "Tag all members with a visible list",
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;

            if (!isOwner) {
                return await sock.sendMessage(jid, { text: "❌ *Owner only command*" }, { quoted: msg });
            }
            if (!jid.endsWith("@g.us")) {
                return await sock.sendMessage(jid, { text: "❌ *Group only*" }, { quoted: msg });
            }

            const customText = args.join(" ") || "📢 Attention Everyone";
            const meta = await sock.groupMetadata(jid);
            const members = meta.participants.map(x => x.id);

            // മെസ്സേജ് മുകളിലും, താഴെ എല്ലാവരുടെയും നമ്പറും വരുന്ന ഡിസൈൻ
            let text = `*${customText}*\n\n*👥 Group Members:*\n\n`;

            members.forEach((member, index) => {
                text += `➢ @${member.split("@")[0]}\n`;
            });

            await sock.sendMessage(jid, {
                text: text,
                mentions: members 
            }, { quoted: msg });
        }
    }
];