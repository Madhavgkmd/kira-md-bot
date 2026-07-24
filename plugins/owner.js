module.exports = {
    name: "owner",
    alias: ["creator", "developer", "admin"],
    category: "general",
    description: "Get Bot Owner Information",
    usage: `${process.env.PREFIX || '.'}owner`,

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        // 1. ഓണറെ കുറിച്ചുള്ള ഒരു ചെറിയ മെസ്സേജ്
        const infoText = `👑 *KIRA X MD - OWNER INFO* 👑\n\n` +
            `👤 *Name:* Madhav\n` +
            `📱 *Number:* +91 91882 52308\n` +
            `💻 *Role:* Developer & Bot Owner\n\n` +
            `> *Feel free to contact for bot queries!*`;

        await sock.sendMessage(jid, { text: infoText }, { quoted: msg });

        // 2. VCard (Contact Card) അയക്കുന്നു
        const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n'
            + 'FN:Madhav\n' // Name
            + 'ORG:KIRA X MD Owner\n'
            + 'TEL;type=CELL;type=VOICE;waid=919188252308:+91 91882 52308\n' // Number
            + 'END:VCARD';

        await sock.sendMessage(jid, {
            contacts: {
                displayName: 'Madhav',
                contacts: [{ displayName: 'Madhav', vcard }]
            }
        }, { quoted: msg });
    }
};