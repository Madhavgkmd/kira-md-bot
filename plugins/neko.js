module.exports = {
    name: 'menu',
    alias: ['help', 'commands', 'dashboard'],
    category: 'utility',
    description: 'Show minimal anime aesthetic bot dashboard with readmore',
    usage: `${process.env.PREFIX || '.'}menu`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = process.env.PREFIX || '.';
        const commands = global.commands || [];

        // User details
        const pushName = msg.pushName || 'Senpai';
        const sender = msg.key.fromMe ? sock.user.id.split(':') + '@s.whatsapp.net' : (msg.key.participant || msg.key.remoteJid);
        
        // Bot details
        const botName = global.getBotName(botNumber) || 'KIRA X MD';
        const ownerName = process.env.OWNER_NAME || 'Madhav'; 
        const mode = process.env.MODE === 'private' ? 'Private' : 'Public';
        const uptime = formatUptime(process.uptime() * 1000);

        // Japanese Greetings based on time (stripped of emojis)
        const hour = new Date().getHours();
        let greeting = 'Konbanwa (Good Evening)';
        if (hour >= 5 && hour < 12) greeting = 'Ohayou (Good Morning)';
        else if (hour >= 12 && hour < 17) greeting = 'Konnichiwa (Good Afternoon)';
        else if (hour >= 17 && hour < 21) greeting = 'Konbanwa (Good Evening)';

        // Grouping commands by category
        const categories = {};
        for (const cmd of commands) {
            if (cmd.name === 'menu') continue;
            const cat = cmd.category || 'Utility';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd.name);
        }

        // --- GREETING TEXT ---
        let greetText = `${greeting}, *@${sender.split('@')}* Senpai`;
        
        // --- BOT INFO BOX (Minimalist, emoji-free) ---
        let botInfoText = "*[ KIRA X MD ]*\n\n" +
                          "*User:* " + pushName + "\n" +
                          "*Master:* " + ownerName + "\n" +
                          "*Prefix:* [ " + prefix + " ]\n" +
                          "*Mode:* " + mode + "\n" +
                          "*Uptime:* " + uptime + "\n" +
                          "*Jutsus:* " + commands.length;

        // --- READMORE FEATURE ---
        // \u200E character inserted after the info box to create the "Read More" button
        const readMore = String.fromCharCode(8206);
        
        // Starting with the visible part: greeting and bot info
        let menuText = greetText + "\n\n" + botInfoText + "\n\n" + readMore + "\n".repeat(40);
        
        // The hidden part: commands list
        menuText += "*乂 C O M M A N D S 乂*\n\n";

        for (const cat in categories) {
            menuText += "*「 " + cat.toUpperCase() + " 」*\n";
            categories[cat].forEach(cmd => {
                menuText += "➔ " + prefix + cmd + "\n";
            });
            menuText += "\n";
        }

        menuText += "_© KIRA X MD_";

        // Anime Image URL (Still used for the Ad reply)
        const menuImage = 'https://i.ibb.co/68fKxXq/anime-aesthetic-dark.jpg'; 

        // Premium External Ad Reply (Emoji-free title and body)
        await sock.sendMessage(jid, { 
            text: menuText,
            mentions: [sender],
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999, 
                externalAdReply: {
                    title: `「 K I R A   X   M D 」`,
                    body: `Awakened System`,
                    thumbnailUrl: menuImage,
                    sourceUrl: 'https://github.com/Madhavgkmd/kira-md-bot', 
                    mediaType: 1,
                    renderLargerThumbnail: true 
                }
            }
        }, { quoted: msg });
    }
};

// Uptime Formatter
function formatUptime(ms) {
    let s = Math.floor(ms / 1000);
    let m = Math.floor(s / 60);
    let h = Math.floor(m / 60);
    let d = Math.floor(h / 24);
    h %= 24; m %= 60; s %= 60;
    let uptime = "";
    if (d > 0) uptime += `${d}d `;
    if (h > 0) uptime += `${h}h `;
    if (m > 0) uptime += `${m}m `;
    if (s > 0) uptime += `${s}s`;
    return uptime.trim() || "0s";
}