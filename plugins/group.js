module.exports = [

{
    name: "jid",
    category: "group",

    async execute(sock, msg) {

        const jid = msg.key.remoteJid;

        await sock.sendMessage(jid, {
            text: `📌 JID:\n${jid}`
        });
    }
},

{
    name: "invite",
    category: "owner",

    async execute(sock, msg) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us")) return;

        const code =
            await sock.groupInviteCode(jid);

        await sock.sendMessage(jid, {
            text:
`🔗 Group Invite Link

https://chat.whatsapp.com/${code}`
        });
    }
},

{
    name: "revoke",
    category: "owner",

    async execute(sock, msg) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us")) return;

        await sock.groupRevokeInvite(jid);

        const code =
            await sock.groupInviteCode(jid);

        await sock.sendMessage(jid, {
            text:
`✅ Invite Link Revoked

https://chat.whatsapp.com/${code}`
        });
    }
},

{
    name: "glock",
    category: "group",

    async execute(sock, msg) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us")) return;

        await sock.groupSettingUpdate(
            jid,
            "announcement"
        );

        await sock.sendMessage(jid, {
            text: "🔒 Group Closed"
        });
    }
},

{
    name: "gunlock",
    category: "group",

    async execute(sock, msg) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us")) return;

        await sock.groupSettingUpdate(
            jid,
            "not_announcement"
        );

        await sock.sendMessage(jid, {
            text: "🔓 Group Opened"
        });
    }
},

{
    name: "gname",
    category: "group",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us")) return;

        const name = args.join(" ");

        if (!name) {
            return sock.sendMessage(jid,{
                text:"❌ Example:\n.gname KIRA-X MD"
            });
        }

        await sock.groupUpdateSubject(
            jid,
            name
        );

        await sock.sendMessage(jid,{
            text:"✅ Group Name Updated"
        });
    }
},

{
    name: "gdesc",
    category: "group",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us")) return;

        const desc = args.join(" ");

        if (!desc) {
            return sock.sendMessage(jid,{
                text:"❌ Example:\n.gdesc Hello World"
            });
        }

        await sock.groupUpdateDescription(
            jid,
            desc
        );

        await sock.sendMessage(jid,{
            text:"✅ Group Description Updated"
        });
    }
},

{
    name: "leave",
    category: "owner", // കാറ്റഗറി മാറ്റിയിട്ടുണ്ട് 

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        
        // 1. മെസ്സേജ് അയച്ചത് ആരാണെന്ന് കണ്ടുപിടിക്കാൻ
        const sender = msg.key.participant || msg.key.remoteJid;

        // 2. ഓണർ ആണോ എന്ന് ചെക്ക് ചെയ്യുന്നു (അല്ലെങ്കിൽ ബ്ലോക്ക് ചെയ്യും)
        // (ബോട്ടിന്റെ സ്വന്തം നമ്പറിൽ നിന്ന് അയച്ചതാണോ എന്നറിയാൻ msg.key.fromMe സഹായിക്കും)
        if (!msg.key.fromMe && sender !== `${global.ownerNumber}@s.whatsapp.net`) {
            return await sock.sendMessage(jid, { 
                text: "❌ *This command is restricted to the Bot Owner!*" 
            }, { quoted: msg });
        }

        // ഗ്രൂപ്പിൽ ആണോ എന്ന് ചെക്ക് ചെയ്യുന്നു
        if (!jid.endsWith("@g.us")) {
            return await sock.sendMessage(jid, { 
                text: "❌ *This command can only be used in groups!*" 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { text: "👋 Bye..." });
        
        // ബോട്ട് ഗ്രൂപ്പിൽ നിന്ന് ലെഫ്റ്റ് ആകുന്നു
        await sock.groupLeave(jid);
    }
},

{
    name: "quoted",
    category: "owner",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        // ഓണർ ചെക്ക് ഇവിടെയും കൊടുത്തു
        if (!msg.key.fromMe && sender !== `${global.ownerNumber}@s.whatsapp.net`) {
            return await sock.sendMessage(jid, { 
                text: "❌ *This command is restricted to the Bot Owner!*" 
            }, { quoted: msg });
        }

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return sock.sendMessage(jid, { 
                text: "❌ *Reply to a message to forward it!*" 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { forward: { message: quoted } });
    }
},

{
    name: "grpstatus",
    category: "group",

    async execute(sock, msg) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us")) return;

        const meta =
            await sock.groupMetadata(jid);

        await sock.sendMessage(jid,{
            text:
`📊 GROUP STATUS

📛 Name:
${meta.subject}

👥 Members:
${meta.participants.length}

🆔 ID:
${jid}`
        });
    }
}

];