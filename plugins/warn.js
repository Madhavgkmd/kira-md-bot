module.exports = [

{
    name: "warn",
    category: "group",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us"))
            return;

        const target =
            msg.message?.extendedTextMessage
            ?.contextInfo?.mentionedJid?.[0];

        if (!target)
            return sock.sendMessage(jid,{
                text:"❌ Mention a user"
            });

        const reason =
            args.slice(1).join(" ") ||
            "No Reason";

        if (!global.warnData[jid])
            global.warnData[jid] = {};

        if (!global.warnData[jid][target])
            global.warnData[jid][target] = [];

        global.warnData[jid][target]
            .push(reason);

        const count =
            global.warnData[jid][target].length;

        await sock.sendMessage(jid,{
            text:
`⚠️ WARNING

👤 @${target.split("@")[0]}
📊 Warns: ${count}/${global.warnLimit}

📝 Reason:
${reason}`,
            mentions:[target]
        });

        if (count >= global.warnLimit) {

            await sock.groupParticipantsUpdate(
                jid,
                [target],
                "remove"
            );

            delete global.warnData[jid][target];
        }
    }
},

{
    name:"warnings",
    category:"group",

    async execute(sock,msg){

        const jid = msg.key.remoteJid;

        const target =
            msg.message?.extendedTextMessage
            ?.contextInfo?.mentionedJid?.[0];

        if(!target)
            return;

        const warns =
            global.warnData?.[jid]?.[target]
            || [];

        await sock.sendMessage(jid,{
            text:
`👤 @${target.split("@")[0]}

⚠️ Total Warns:
${warns.length}

${warns.map((x,i)=>
`${i+1}. ${x}`
).join("\n") || "No warnings"}`,
mentions:[target]
        });
    }
},

{
    name: "rmwarn",
    alias: ["rnwarn", "removewarn"], // നീ rnwarn എന്ന് അടിച്ചാലും ഇനി വർക്ക് ആകും
    category: "group",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        // ആരെയും ടാഗ് ചെയ്തില്ലെങ്കിൽ സൈലന്റ് ആയി ഫെയിൽ ആവാതിരിക്കാൻ മെസ്സേജ് കൊടുക്കുന്നു
        if (!target) {
            return await sock.sendMessage(jid, { 
                text: "❌ *Please tag a user to remove their warning!*\n*Example:* .rmwarn @user" 
            }, { quoted: msg });
        }

        // വാണിംഗ് ഉണ്ടെങ്കിൽ കുറയ്ക്കാൻ
        if (global.warnData?.[jid]?.[target]?.length > 0) {
            global.warnData[jid][target].pop();
            await sock.sendMessage(jid, { 
                text: `✅ *One warning removed for @${target.split("@")[0]}*`,
                mentions: [target]
            });
        } else {
            await sock.sendMessage(jid, { 
                text: "⚠️ *This user has no warnings to remove!*" 
            }, { quoted: msg });
        }
    }
},

{
    name:"resetwarn",
    category:"group",

    async execute(sock,msg){

        const jid = msg.key.remoteJid;

        const target =
            msg.message?.extendedTextMessage
            ?.contextInfo?.mentionedJid?.[0];

        if(!target)
            return;

        if(global.warnData?.[jid])
            delete global.warnData[jid][target];

        await sock.sendMessage(jid,{
            text:"✅ Warnings reset"
        });
    }
},

{
    name:"setwarnlimit",
    category:"group",

    async execute(sock,msg,args){

        const jid = msg.key.remoteJid;

        const num =
            parseInt(args[0]);

        if(!num)
            return;

        global.warnLimit = num;

        await sock.sendMessage(jid,{
            text:
`✅ Warn limit set to ${num}`
        });
    }
}

];