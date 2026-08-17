module.exports = {
    name: "alive",
    alias: ["status"],
    category: "main",
    description: "Check bot status",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const ms = Date.now() - (global.startTime || Date.now());

        const d = Math.floor(ms / (24 * 60 * 60 * 1000));
        const h = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        const s = Math.floor((ms % (60 * 1000)) / 1000);

        const uptime = `${d}d ${h}h ${m}m ${s}s`;

        await sock.sendMessage(
            jid,
            {
                text: `🩸 *I'm Alive, Senpai!*

⏱️ *Uptime:* ${uptime}`
            },
            { quoted: msg }
        );
    }
};