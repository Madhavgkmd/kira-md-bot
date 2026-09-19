module.exports = {
    name: 'demote',
    alias: ['unadmin'],
    category: 'group',
    description: 'Demote an admin to normal member',
    
    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith('@g.us')) return await sock.sendMessage(jid, { text: "❌ *This command can only be used in groups!*" }, { quoted: msg });

        // 🚨 Admin Check
        const sender = msg.key.participant || msg.key.remoteJid;
        const groupMetadata = await sock.groupMetadata(jid);
        const isAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isAdmin && !isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
        }

        const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        let target = quotedJid || (mentionedJid && mentionedJid.length > 0 ? mentionedJid[0] : null);

        if (!target && args.length > 0) target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        if (!target) return await sock.sendMessage(jid, { text: "❌ *Reply to or mention the admin to demote!*" }, { quoted: msg });

        try {
            await sock.groupParticipantsUpdate(jid, [target], "demote");
            await sock.sendMessage(jid, { text: `✅ *@${target.split('@')[0]} is no longer an Admin!*`, mentions: [target] }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(jid, { text: "❌ *Failed! Make sure the bot is an admin.*" }, { quoted: msg });
        }
    }
};