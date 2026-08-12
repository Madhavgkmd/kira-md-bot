// plugins/antipromote.js – KIRA X MD (Anti-Promote & Anti-Demote)
const { getSettings, updateSetting } = require('../lib/database');

const recentActions = {};

function shouldProcess(jid, action, authorPhone) {
    const now = Date.now();
    const key = `${jid}_${action}_${authorPhone}`;
    if (recentActions[key] && (now - recentActions[key] < 5000)) return false;
    recentActions[key] = now;
    return true;
}

function getPhoneFromJid(jid) {
    if (!jid) return '';
    return jid.split('@')[0].replace(/[^0-9]/g, '');
}

function isOwnerJid(authorPhone, botPhone) {
    const mainOwnerPhone = process.env.OWNER_NUMBER ? process.env.OWNER_NUMBER.replace(/[^0-9]/g, '') : '';
    return authorPhone === mainOwnerPhone || authorPhone === botPhone;
}

function isSudoJid(authorPhone) {
    const sudoUsers = global.sudoUsers || [];
    return sudoUsers.some(s => {
        const sPhone = s.split('@')[0].replace(/[^0-9]/g, '');
        return sPhone === authorPhone;
    });
}

async function getRealAuthor(sock, jid, author) {
    if (!author || !author.includes('@lid')) return author;
    try {
        const meta = await sock.groupMetadata(jid);
        const p = meta.participants.find(x => x.id === author || x.lid === author);
        if (p) {
            if (p.phoneNumber) return p.phoneNumber.includes('@') ? p.phoneNumber : `${p.phoneNumber}@s.whatsapp.net`;
            if (p.id && !p.id.includes('@lid')) return p.id;
        }
    } catch(e) {}
    return author;
}

// ─── COMMAND LOGIC ───
const handleToggle = async (sock, msg, args, isOwner, isPromote) => {
    const jid = msg.key.remoteJid;
    
    // 🔥 Admin പെർമിഷൻ ഒഴിവാക്കി. വെറും Owner-ന് മാത്രം!
    if (!isOwner) {
        return await sock.sendMessage(jid, { text: '❌ *Owner only command!*' }, { quoted: msg });
    }

    if (!jid.endsWith('@g.us')) return await sock.sendMessage(jid, { text: '❌ *Group only!*' }, { quoted: msg });

    const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
    const config = getSettings(botNumber);

    let targetList = isPromote ? (config.antiPromoteChats || []) : (config.antiDemoteChats || []);
    const targetName = isPromote ? 'Anti‑Promote' : 'Anti‑Demote';
    const dbKey = isPromote ? 'antiPromoteChats' : 'antiDemoteChats';
    const action = (args && args.length) ? args[0].toLowerCase() : '';

    if (action === 'on') {
        if (!targetList.includes(jid)) {
            targetList.push(jid);
            updateSetting(botNumber, dbKey, targetList);
            await sock.sendMessage(jid, { text: `✅ *${targetName} enabled* (For this bot)` }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, { text: `⚠️ *Already enabled*` }, { quoted: msg });
        }
    } else if (action === 'off') {
        const idx = targetList.indexOf(jid);
        if (idx !== -1) {
            targetList.splice(idx, 1);
            updateSetting(botNumber, dbKey, targetList);
            await sock.sendMessage(jid, { text: `❌ *${targetName} disabled* (For this bot)` }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, { text: `⚠️ *Already disabled*` }, { quoted: msg });
        }
    } else {
        const status = targetList.includes(jid) ? '🟢 ENABLED' : '🔴 DISABLED';
        await sock.sendMessage(jid, { text: `🛡️ *${targetName} Status*\n➤ ${status}\n\nUsage: .${isPromote ? 'antipromote' : 'antidemote'} on/off` }, { quoted: msg });
    }
};

module.exports = [
    {
        name: 'antipromote',
        alias: ['ap'],
        category: 'owner',
        description: 'Toggle anti-promote protection (Owner Only)',
        usage: '.antipromote on/off',
        async execute(sock, msg, args, isOwner) { await handleToggle(sock, msg, args, isOwner, true); }
    },
    {
        name: 'antidemote',
        alias: ['ad'],
        category: 'owner',
        description: 'Toggle anti-demote protection (Owner Only)',
        usage: '.antidemote on/off',
        async execute(sock, msg, args, isOwner) { await handleToggle(sock, msg, args, isOwner, false); }
    }
];

// ─── EVENT LISTENER ───
async function initAntiPromoteListener(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const jid = update.id;
            const action = update.action;
            const participants = update.participants;
            const rawAuthor = update.author;

            if (action !== 'promote' && action !== 'demote') return;

            const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
            const config = getSettings(botNumber);

            const isPromote = (action === 'promote');
            const isProtected = isPromote ? (config.antiPromoteChats || []).includes(jid) : (config.antiDemoteChats || []).includes(jid);
            if (!isProtected) return;

            const realAuthor = await getRealAuthor(sock, jid, rawAuthor);
            const authorPhone = getPhoneFromJid(realAuthor);
            const botPhone = getPhoneFromJid(sock.user.id);
            
            if (authorPhone === botPhone || rawAuthor === sock.user.id) return;
            if (isOwnerJid(authorPhone, botPhone) || isSudoJid(authorPhone)) return;
            if (!shouldProcess(jid, action, authorPhone)) return;

            const targetUsers = participants.map(p => {
                let num = p.phoneNumber || p.id;
                return num.includes('@') ? num : `${num}@s.whatsapp.net`;
            }).filter(id => id && !id.includes('@lid')); 

            if (targetUsers.length === 0) return;

            const revertAction = isPromote ? 'demote' : 'promote';
            await sock.sendMessage(jid, { 
                text: `🛡️ *Security Alert!*\n@${authorPhone} tried to ${action} users. Reverting...`, 
                mentions: [realAuthor] 
            });

            try {
                await sock.groupParticipantsUpdate(jid, [realAuthor], 'demote');
                await sock.groupParticipantsUpdate(jid, targetUsers, revertAction);
            } catch (e) { console.error(e.message); }

        } catch (err) { console.error(err); }
    });
}

module.exports.initAntiPromote = initAntiPromoteListener;