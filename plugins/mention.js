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

            // 🔥 റിപ്ലൈ ചെയ്ത മെസ്സേജ് കണ്ടുപിടിക്കാനുള്ള 'Pro' ലോജിക്
            let quoteTarget = msg;
            if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
                quoteTarget = {
                    key: {
                        remoteJid: jid,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    },
                    message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                };
            }

            // ലിസ്റ്റ് ഇല്ലാതെ മെസ്സേജ് മാത്രം അയക്കുന്നു, പക്ഷെ എല്ലാവർക്കും ടാഗ് പോകും
            await sock.sendMessage(jid, {
                text: text,
                mentions: members 
            }, { quoted: quoteTarget }); // 🔥 ഇവിടെ quoteTarget ആക്കി മാറ്റി
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

            // 🔥 റിപ്ലൈ ചെയ്ത മെസ്സേജ് കണ്ടുപിടിക്കാനുള്ള 'Pro' ലോജിക്
            let quoteTarget = msg;
            if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
                quoteTarget = {
                    key: {
                        remoteJid: jid,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    },
                    message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                };
            }

            // മെസ്സേജ് മുകളിലും, താഴെ എല്ലാവരുടെയും നമ്പറും വരുന്ന ഡിസൈൻ
            let text = `*${customText}*\n\n*👥 Group Members:*\n\n`;

            members.forEach((member, index) => {
                text += `➢ @${member.split("@")[0]}\n`;
            });

            await sock.sendMessage(jid, {
                text: text,
                mentions: members 
            }, { quoted: quoteTarget }); // 🔥 ഇവിടെയും quoteTarget ആക്കി മാറ്റി
        }
    }
];