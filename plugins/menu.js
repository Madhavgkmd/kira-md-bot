const { getSettings } = require("../lib/database");

module.exports = {
    name: "menu",
    alias: ["help", "commands"],
    category: "main",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const pushname = msg.pushName || "User";
        const prefix = process.env.PREFIX || ".";
        
        // 🔥 ബോട്ടിന്റെ നമ്പർ കണ്ടുപിടിക്കുന്നു (എറർ മാറ്റാൻ ഇത് നിർബന്ധമാണ്)
        const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
        
        // ഡാറ്റാബേസിൽ നിന്ന് ആ ബോട്ടിന്റെ കറക്റ്റ് സെറ്റിങ്സ് എടുക്കുന്നു
        const config = getSettings(botNumber) || {};
        
        // 🔥 Dynamic Bot, Owner & Image (Independent for Main & Pair Bots)
        const botName = config.botName || process.env.BOT_NAME || "KIRA X MD";
        const ownerName = config.ownerName || process.env.OWNER_NAME || "Madhav";
        const menuImage = config.menuImage || process.env.MENU_IMAGE || "https://files.catbox.moe/22x0j5.jpeg";
        
        const mode = global.botMode || config.botMode || "public"; 
        
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
        let menu = `🩸 ${botName.split('').join(' ')} 🩸\n\n`;
        menu += `╔══════════════ ♱\n`;
        menu += `╠ ♱ ᴜsᴇʀ : ${pushname}\n`;
        menu += `╠ ♱ ᴏᴡɴᴇʀ : ${ownerName}\n`;
        menu += `╠ ♱ ᴘʀᴇғɪx : ${prefix}\n`;
        menu += `╠ ♱ ᴍᴏᴅᴇ : ${mode.toUpperCase()}\n`;
        menu += `╠ ♱ ᴜᴘᴛɪᴍᴇ : ${uptimeText}\n`;
        menu += `╠ ♱ ᴘʟᴜɢɪɴs : ${commands.length}\n`;
        menu += `╚══════════════ ♱\n\n`;

        for (const category of Object.keys(categories)) {
            menu += `♱ ── ❴ ${category} ❵ ── ♱\n`;
            for (const cmd of categories[category]) {
                menu += `╟ ♡ ${cmd}\n`;
            }
            menu += `╚══════════════ ♱\n\n`;
        }

        menu += `> *${botName}*`;

        // Send Message with Image
        await sock.sendMessage(jid, {
            image: { url: menuImage },
            caption: menu
        }, { quoted: msg });
    }
};