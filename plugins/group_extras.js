// plugins/group_extras.js – KIRA X MD (Extras)
const fs = require('fs');
const path = './banned_users.json';

// ബാൻ ചെയ്തവരെ സേവ് ചെയ്യാൻ
function getBanned() {
    if (!fs.existsSync(path)) return [];
    try { return JSON.parse(fs.readFileSync(path)); } catch { return []; }
}

function saveBanned(list) {
    fs.writeFileSync(path, JSON.stringify(list, null, 2));
}

module.exports = [
    // 1. BAN
    {
        name: 'ban',
        category: 'group',
        description: 'Ban a user from the group',
        usage: '.ban @user',
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || jid;
            const meta = await sock.groupMetadata(jid);
            const isAdmin = meta.participants.some(p => p.id === sender && p.admin);
            if (!isAdmin && !isOwner) return await sock.sendMessage(jid, { text: '❌ *Admins only!*' });

            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) return await sock.sendMessage(jid, { text: '⚠️ *Tag someone to ban!*' });

            let banned = getBanned();
            if (!banned.includes(target)) {
                banned.push(target);
                saveBanned(banned);
            }
            try {
                await sock.groupParticipantsUpdate(jid, [target], 'remove');
                await sock.sendMessage(jid, { text: `🚫 *@${target.split('@')[0]} has been banned!*`, mentions: [target] });
            } catch(e) { await sock.sendMessage(jid, { text: '❌ *Failed to kick user.*' }); }
        }
    },
    // 2. UNBAN
    {
        name: 'unban',
        category: 'group',
        description: 'Unban a user',
        usage: '.unban @user',
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || jid;
            const meta = await sock.groupMetadata(jid);
            const isAdmin = meta.participants.some(p => p.id === sender && p.admin);
            if (!isAdmin && !isOwner) return;

            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) return await sock.sendMessage(jid, { text: '⚠️ *Tag someone to unban!*' });

            let banned = getBanned();
            banned = banned.filter(id => id !== target);
            saveBanned(banned);
            await sock.sendMessage(jid, { text: `✅ *@${target.split('@')[0]} has been unbanned!*`, mentions: [target] });
        }
    },
    // 3. KICKME (Self-kick)
    {
        name: 'kickme',
        category: 'group',
        description: 'Leave the group',
        usage: '.kickme',
        async execute(sock, msg) {
            await sock.sendMessage(msg.key.remoteJid, { text: '👋 *Leaving group...*' });
            await sock.groupParticipantsUpdate(msg.key.remoteJid, [msg.key.participant], 'remove');
        }
    },
    // 4. PROMOTEME
    {
        name: 'promoteme',
        category: 'group',
        description: 'Request promotion from admins',
        usage: '.promoteme',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant;
            const meta = await sock.groupMetadata(jid);
            const admins = meta.participants.filter(p => p.admin).map(p => p.id);
            
            await sock.sendMessage(jid, { 
                text: `⚠️ *Promotion Request!*\n@${sender.split('@')[0]} is requesting Admin role.`, 
                mentions: [...admins, sender] 
            });
        }
    },
    // 5. TOTALMEMBERS
    {
        name: 'totalmembers',
        alias: ['count'],
        category: 'group',
        description: 'Count group members',
        usage: '.totalmembers',
        async execute(sock, msg) {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            await sock.sendMessage(msg.key.remoteJid, { text: `👥 *Total Members:* ${meta.participants.length}` });
        }
    }
];