const { exec } = require("child_process");

module.exports = {
    name: "pupdate",
    category: "owner",

    async execute(sock,msg,args,isOwner){

        if(!isOwner) return;

        const jid = msg.key.remoteJid;

        await sock.sendMessage(jid,{
            text:"🔄 Updating..."
        });

        exec("git pull",(err,stdout,stderr)=>{

            if(err){
                return sock.sendMessage(jid,{
                    text:`❌ ${err.message}`
                });
            }

            sock.sendMessage(jid,{
                text:`✅ Update Complete\n\n${stdout}`
            });
        });
    }
};