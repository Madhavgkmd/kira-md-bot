const { startSubBot } = require('../lib/subbot'); 

module.exports = {
    name: 'pair',
    alias: ['jadibot', 'clone', 'subbot'],
    category: 'utility',
    description: 'Connect your number as a sub-bot instantly',
    usage: `${process.env.PREFIX || '.'}pair 919876543210`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = process.env.PREFIX || '.';
        const textArgs = Array.isArray(args) ? args.join(" ") : args;

        if (!textArgs) {
            return sock.sendMessage(jid, { 
                text: `╭━━━〔 ✦ 𝑷𝑨𝑰𝑹𝑰𝑵𝑮 ✦ 〕━━━⬣\n┃ ⚠️ *Number is missing!*\n┃\n┃ 📌 *Example:*\n┃ ${prefix}pair 919876543210\n╰━━━━━━━━━━━━━━━⬣` 
            }, { quoted: msg });
        }

        let phoneNumber = textArgs.replace(/[^0-9]/g, ''); 

        await sock.sendMessage(jid, { 
            text: `╭━━━〔 ✦ 𝑲𝑰𝑹𝑨 𝑿 𝑴𝑫 ✦ 〕━━━⬣\n┃ 🔄 *Processing Request...*\n┃ 📡 *Target:* +${phoneNumber}\n┃\n┃ _Generating your pairing code..._\n╰━━━━━━━━━━━━━━━⬣` 
        }, { quoted: msg });

        // lib/subbot.js ലെ ഫംഗ്ഷൻ വിളിക്കുന്നു
        await startSubBot(phoneNumber, sock, jid, msg);
    }
};