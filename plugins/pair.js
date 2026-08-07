const { startSubBot } = require('../lib/subbot'); // പാത്ത് കൃത്യമാണോ എന്ന് നോക്കുക (lib ഫോൾഡർ എവിടെയാണോ അതനുസരിച്ച്)

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
                text: `❌ *Please provide a WhatsApp number!*\n\n*Example:* ${prefix}pair 919876543210` 
            }, { quoted: msg });
        }

        let phoneNumber = textArgs.replace(/[^0-9]/g, ''); 

        await sock.sendMessage(jid, { 
            text: `⏳ _Requesting pairing code for +${phoneNumber}... Please wait._` 
        }, { quoted: msg });

        // lib/subbot.js ലെ ഫംഗ്ഷൻ വിളിക്കുന്നു
        await startSubBot(phoneNumber, sock, jid, msg);
    }
};