const fs = require("fs");

module.exports = {
    name: "gpp",
    category: "group",

    async execute(sock,msg,args,isOwner){

        const jid = msg.key.remoteJid;

        if(!jid.endsWith("@g.us")) return;

        const quoted =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if(!quoted?.imageMessage){
            return sock.sendMessage(jid,{
                text:"❌ Reply to image"
            });
        }

        const buffer =
        await sock.downloadMediaMessage({
            message: quoted
        });

        fs.writeFileSync("./gpp.jpg",buffer);

        await sock.updateProfilePicture(
            jid,
            fs.readFileSync("./gpp.jpg")
        );

        fs.unlinkSync("./gpp.jpg");

        await sock.sendMessage(jid,{
            text:"✅ Group Profile Updated"
        });
    }
};