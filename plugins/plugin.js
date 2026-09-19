const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "plugin",
    alias: ["addplugin"],
    category: "owner",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;

        const url = args[0];

        if (!url) {
            return sock.sendMessage(jid,{
                text:"❌ Give Gist Raw URL"
            });
        }

        try {

            const res = await axios.get(url);

            const code = res.data;

            const match =
                code.match(
                    /name:\s*['"`](.*?)['"`]/
                );

            const fileName =
                match?.[1] || Date.now();

            const savePath =
                path.join(
                    __dirname,
                    `${fileName}.js`
                );

            fs.writeFileSync(
                savePath,
                code
            );

            delete require.cache[
                require.resolve(savePath)
            ];

            const plugin =
                require(savePath);

            global.commands.push(plugin);

            await sock.sendMessage(jid,{
                text:`✅ Plugin Installed\n\n${fileName}`
            });

        } catch(err) {

            await sock.sendMessage(jid,{
                text:`❌ ${err.message}`
            });
        }
    }
};