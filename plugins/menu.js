// plugins/menu.js - KIRA X MD (Accurate Global User Tracking)
const os = require("os");
const { getSettings } = require("../lib/database");

// Helper function to convert text safely into small-caps font
function toSmallCaps(str) {
    if (!str || typeof str !== "string") return "";
    
    const smallCapsMap = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ',
        'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ',
        'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ',
        'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆',
        '7': '₇', '8': '₈', '9': '₉'
    };

    return str.toLowerCase().split('').map(char => smallCapsMap[char] || char).join('');
}

module.exports = {
    name: "menu",
    alias: ["help", "commands"],
    category: "main",
    description: "Display command list with system telemetry",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const pushname = msg.pushName || "User";
        const prefix = process.env.PREFIX || ".";

        await sock.sendMessage(jid, { react: { text: "📜", key: msg.key } });

        const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
        const config = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};

        const botName = config.botName || process.env.BOT_NAME || "KIRA X MD";
        const ownerName = config.ownerName || process.env.OWNER_NAME || "Madhav";
        const menuImage = config.menuImage || process.env.MENU_IMAGE || "https://files.catbox.moe/22x0j5.jpeg";
        const mode = (global.botMode || config.botMode || "public").toUpperCase();

        // Fetch Live Total Users
        const totalUsersCount = global.totalBotUsers ? global.totalBotUsers.size : 1;

        // Uptime calculations with seconds
        const uptime = process.uptime();
        const d = Math.floor(uptime / (3600 * 24));
        const h = Math.floor((uptime % (3600 * 24)) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        const uptimeString = d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`;

        // Telemetry stats in GB
        const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
        const usedMemGB = ((os.totalmem() - os.freemem()) / (1024 * 1024 * 1024)).toFixed(1);
        const platform = os.platform();

        const rawCommands = global.commands || [];
        const categories = {};
        let validCommandCount = 0;

        for (const item of rawCommands) {
            const cmdList = Array.isArray(item) ? item : [item];
            for (const cmd of cmdList) {
                if (!cmd || !cmd.name) continue;
                const cat = (cmd.category || "other").toUpperCase();
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(String(cmd.name));
                validCommandCount++;
            }
        }

        // Elegant Line Formatting
        let menu = `─── ❖ ${botName} ❖ ───\n\n`;
        
        menu += `  [ ᴜsᴇʀ ]\n`;
        menu += `  • ɴᴀᴍᴇ    : ${pushname}\n`;
        menu += `  • ᴘʀᴇғɪx  : ${prefix}\n`;
        menu += `  • ᴜsᴇʀs   : ${totalUsersCount.toLocaleString()}\n\n`;

        menu += `  [ sʏsᴛᴇᴍ ]\n`;
        menu += `  • ᴏᴡɴᴇʀ   : ${ownerName}\n`;
        menu += `  • ᴍᴏᴅᴇ    : ${mode}\n`;
        menu += `  • ᴘʟᴀᴛғᴏʀᴍ: ${platform}\n`;
        menu += `  • ᴍᴇᴍᴏʀʏ  : ${usedMemGB} GB / ${totalMemGB} GB\n`;
        menu += `  • ᴜᴘᴛɪᴍᴇ  : ${uptimeString}\n`;
        menu += `  • ᴘʟᴜɢɪɴs : ${validCommandCount}\n\n`;

        for (const category of Object.keys(categories)) {
            menu += `── ❪ ${category} ❫ ──\n`;
            for (const cmdName of categories[category]) {
                menu += `  ◈ ${prefix}${toSmallCaps(cmdName)}\n`;
            }
            menu += `\n`;
        }

        menu += `> ${botName} • 2026`;

        await sock.sendMessage(jid, {
            image: { url: menuImage },
            caption: menu
        }, { quoted: msg });
    }
};
