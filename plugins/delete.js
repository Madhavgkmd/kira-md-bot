module.exports = {
    name: "delete",
    alias:["del"],
    category:"group",

    async execute(sock,msg){

        const jid = msg.key.remoteJid;

        const quoted =
            msg.message?.extendedTextMessage
            ?.contextInfo;

        if(!quoted){
            return sock.sendMessage(jid,{
                text:"❌ Reply a bot message"
            });
        }

        await sock.sendMessage(
            jid,
            {
                delete:{
                    remoteJid: jid,
                    fromMe: true,
                    id: quoted.stanzaId
                }
            }
        );
    }
};