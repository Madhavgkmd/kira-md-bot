const fs = require("fs");
const path = require("path");

module.exports = {
    name: "plugins",
    alias: ["plist"],
    category: "owner",

    async execute(sock,msg){

        const jid = msg.key.remoteJid;

        const files =
            fs.readdirSync(__dirname)
            .filter(f=>f.endsWith(".js"));

        let txt = "📦 Installed Plugins\n\n";

        files.forEach((f,i)=>{
            txt += `${i+1}. ${f}\n`;
        });

        await sock.sendMessage(jid,{
            text: txt
        });
    }
};