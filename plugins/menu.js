module.exports = {
    name: "menu",
    alias: ["help", "commands"],
    category: "main",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const pushname = msg.pushName || "User";
        const prefix = process.env.PREFIX || ".";
        
        // 🔥 തിരുത്തിയത്: process.env.MODE മാറ്റി global.botMode ആക്കി!
        const mode = global.botMode || "public"; 
        
        // Uptime Calculation
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        const uptimeText = `${h}h ${m}m ${s}s`;

        const commands = global.commands || [];
        const categories = {};

        for (const cmd of commands) {
            const cat = (cmd.category || "other").toUpperCase();
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(`${prefix}${cmd.name}`);
        }

        // 🔥 Horror Glitch Menu Design
        let menu = `🩸 𝕶 𝕴 𝕽 𝕬  𝖃  𝕸 𝕯 🩸\n\n`;
        menu += `╔══════════════ ♱\n`;
        menu += `╠ ♱ 𝔘𝔰𝔢𝔯 : ${pushname}\n`;
        menu += `╠ ♱ 𝔓𝔯𝔢𝔣𝔦𝔵 : ${prefix}\n`;
        menu += `╠ ♱ 𝔐𝔬𝔡𝔢 : ${mode.toUpperCase()}\n`;
        menu += `╠ ♱ 𝔘𝔭𝔱𝔦𝔪𝔢 : ${uptimeText}\n`;
        menu += `╠ ♱ 𝔓𝔩𝔲𝔤𝔦𝔫𝔰 : ${commands.length}\n`;
        menu += `╚══════════════ ♱\n\n`;

        for (const category of Object.keys(categories)) {
            menu += `♱ ── ❴ ${category} ❵ ── ♱\n`;
            for (const cmd of categories[category]) {
                menu += `╟ ♡ ${cmd}\n`;
            }
            menu += `╚══════════════ ♱\n\n`;
        }

        // Send Message with Image
        await sock.sendMessage(jid, {
            image: { url: "https://files.catbox.moe/22x0j5.jpeg" },
            caption: menu
        }, { quoted: msg });
    }
};