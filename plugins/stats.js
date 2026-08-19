const axios = require("axios");
const os = require("os");

module.exports = {
    name: "stats",
    alias: ["botinfo", "runtime", "health"],
    category: "owner",
    description: "Advanced bot statistics",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(
                jid,
                { text: "❌ Owner only!" },
                { quoted: msg }
            );
        }

        const start = Date.now();

        const mem = process.memoryUsage();

        const ram =
            (mem.rss / 1024 / 1024)
            .toFixed(2);

        const heap =
            (mem.heapUsed / 1024 / 1024)
            .toFixed(2);

        const totalRam =
            (
                os.totalmem() /
                1024 /
                1024 /
                1024
            ).toFixed(2);

        const freeRam =
            (
                os.freemem() /
                1024 /
                1024 /
                1024
            ).toFixed(2);

        const cpu =
            os.cpus()[0].model;

        const uptime =
            format(process.uptime());

        // 🔥 Dynamic Bot Name Helper
        const botName = global.config?.BOT_NAME || global.getBotName(botNumber) || 'KIRA X MD';

        const apis = [
            "https://api-aswin-sparky.koyeb.app",
            "https://jerrycoder.oggyapi.workers.dev"
        ];

        let apiText = "";
        let online = 0;
        let offline = 0;

        for (const api of apis) {
            try {
                const s = Date.now();

                await axios.get(api, {
                    timeout: 5000
                });

                const ms =
                    Date.now() - s;

                apiText +=
                    `🟢 ${ms}ms\n`;

                online++;

            } catch {
                apiText +=
                    `🔴 Offline\n`;

                offline++;
            }
        }

        const ping =
            Date.now() - start;

        const text =
`╭━━〔 🤖 ${botName} 〕
┃🟢 Status : Online
┃⚡ Ping : ${ping} ms
┃⏱️ Uptime : ${uptime}
┃📦 Plugins : ${(global.commands || []).length}
┃⚙️ Commands : ${(global.commands || []).length}
┃💾 RAM : ${ram} MB
┃🧠 Heap : ${heap} MB
┃🖥️ System RAM : ${freeRam}/${totalRam} GB
┃🔧 Platform : ${process.platform}
┃📌 Node : ${process.version}
┃🖥️ CPU :
┃${cpu}
┃🚂 Railway :
┃${process.env.RAILWAY_STATIC_URL || "Unknown"}
┃👤 Owner :
┃${global.ownerNumber || "Not Set"}
╰━━━━━━━━━━━

🌐 API STATUS
${apiText}

🟢 Online APIs : ${online}
🔴 Offline APIs : ${offline}

> *${botName}*`;

        await sock.sendMessage(
            jid,
            { text },
            { quoted: msg }
        );
    }
};

function format(sec) {
    sec = Math.floor(sec);

    const d =
        Math.floor(sec / 86400);

    const h =
        Math.floor(
            (sec % 86400) / 3600
        );

    const m =
        Math.floor(
            (sec % 3600) / 60
        );

    const s =
        sec % 60;

    return `${d}d ${h}h ${m}m ${s}s`;
}