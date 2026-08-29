module.exports = {
    name: 'pair',
    alias: ['jadibot', 'clone', 'subbot'],
    category: 'utility',
    description: 'Connect your number as a sub-bot (Temporarily Disabled)',
    usage: `${process.env.PREFIX || '.'}pair 919876543210`,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        // ആര് ഈ കമാൻഡ് അടിച്ചാലും പോകുന്ന മെയിന്റനൻസ് മെസ്സേജ്
        const maintenanceMsg = `╭━━━〔 ✦ 𝑷𝑨𝑰𝑹𝑰𝑵𝑮 ✦ 〕━━━⬣
┃ ⚠️ *Temporarily Unavailable*
┃
┃ This feature is temporarily down.
┃ We will fix it and be back online soon!
┃ Contact the owner for more information.
┃
┃ > type .owner for owner contact
╰━━━━━━━━━━━━━━━⬣`;

        return await sock.sendMessage(jid, { text: maintenanceMsg }, { quoted: msg });
    }
};
