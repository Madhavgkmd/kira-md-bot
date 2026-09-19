module.exports = {
    name: 'mute',
    alias: ['close', 'lock'],
    category: 'group', // 🚨 കാറ്റഗറി മാറ്റി
    description: 'Mute the group (Only admins can send messages)',
    
    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith('@g.us')) return await sock.sendMessage(jid, { text: "❌ *This command can only be used in groups!*" }, { quoted: msg });

        // 🚨 Admin Check 🚨
        const sender = msg.key.participant || msg.key.remoteJid;
        const groupMetadata = await sock.groupMetadata(jid);
        const isAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isAdmin && !isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
        }

        try {
            await sock.groupSettingUpdate(jid, 'announcement');
            await sock.sendMessage(jid, { text: "🔒 *Group Muted! Only Admins can send messages.*" }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(jid, { text: "❌ *Failed! Make sure the bot is an admin.*" }, { quoted: msg });
        }
    }
};