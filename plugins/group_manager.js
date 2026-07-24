// plugins/group_manager.js – KIRA X MD (Unified Group Plugin)
const fs = require('fs');
const settingsPath = './group_settings.json';
const activityPath = './activity_db.json'; // പുതിയ ഡാറ്റാബേസ്

// ─── Shared Database/Utils ───
let activityDb = {};

function loadSettings() {
    let data = { antifakeChats: [] };
    if (fs.existsSync(settingsPath)) {
        try { data = JSON.parse(fs.readFileSync(settingsPath)); } catch(e){}
    }
    global.antifakeChats = data.antifakeChats || [];

    if (fs.existsSync(activityPath)) {
        try { activityDb = JSON.parse(fs.readFileSync(activityPath)); } catch(e){}
    }
}

function saveSettings() {
    let data = {};
    if (fs.existsSync(settingsPath)) {
        try { data = JSON.parse(fs.readFileSync(settingsPath)); } catch(e){}
    }
    data.antifakeChats = global.antifakeChats;
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
}

function saveActivity() {
    fs.writeFileSync(activityPath, JSON.stringify(activityDb, null, 2));
}

loadSettings();

// ─── Common Activity Logic (FIXED) ───
async function getActivityData(sock, jid) {
    const meta = await sock.groupMetadata(jid);
    const participants = meta.participants.map(p => p.id);
    const counts = {};
    
    // എല്ലാവരുടെയും കൗണ്ട് ആദ്യം 0 ആക്കുന്നു
    participants.forEach(p => counts[p] = 0);
    
    let totalMsgs = 0;

    // ഡാറ്റാബേസിൽ നിന്നും കൗണ്ട് എടുക്കുന്നു
    if (activityDb[jid]) {
        for (const [sender, count] of Object.entries(activityDb[jid])) {
            if (counts[sender] !== undefined) {
                counts[sender] += count;
                totalMsgs += count;
            }
        }
    }
    return { participants, counts, totalMsgs };
}

// ─── Admin Check Helper ───
async function checkAdminStatus(sock, msg, isOwner) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '❌ *This command is for groups only!*' }, { quoted: msg });
        return { allowed: false };
    }
    const sender = msg.key.participant || jid;
    const meta = await sock.groupMetadata(jid);
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    
    const isBotAdmin = meta.participants.some(p => p.id === botJid && p.admin);
    const isAdmin = meta.participants.some(p => p.id === sender && p.admin);

    if (!isBotAdmin) {
        await sock.sendMessage(jid, { text: '❌ *I need Admin privileges to do this!*' }, { quoted: msg });
        return { allowed: false };
    }
    if (!isAdmin && !isOwner) {
        await sock.sendMessage(jid, { text: '❌ *Admins only!*' }, { quoted: msg });
        return { allowed: false };
    }
    return { allowed: true, meta };
}

module.exports = [
    // 1. LIST ACTIVE
    {
        name: 'listactive',
        alias: ['active'],
        category: 'group',
        description: 'Most active members',
        usage: '.listactive',
        async execute(sock, msg, args, isOwner) {
            const { allowed } = await checkAdminStatus(sock, msg, isOwner);
            if (!allowed) return;

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "📊", key: msg.key } });
            const { participants, counts, totalMsgs } = await getActivityData(sock, msg.key.remoteJid);
            
            const activeUsers = participants.filter(p => counts[p] > 0).sort((a, b) => counts[b] - counts[a]).slice(0, 15);
            
            if (activeUsers.length === 0) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ No active members yet (Waiting for new messages).' }, { quoted: msg });
            
            let txt = `🔥 *TOP ACTIVE MEMBERS*\n_Based on ${totalMsgs} recent messages_\n\n`;
            activeUsers.forEach((u, i) => txt += `${i + 1}. @${u.split('@')[0]} - *${counts[u]} msgs*\n`);
            await sock.sendMessage(msg.key.remoteJid, { text: txt, mentions: activeUsers }, { quoted: msg });
        }
    },
    // 2. LIST INACTIVE
    {
        name: 'listinactive',
        alias: ['ghosts'],
        category: 'group',
        description: 'Inactive members (Ghosts)',
        usage: '.listinactive',
        async execute(sock, msg, args, isOwner) {
            const { allowed } = await checkAdminStatus(sock, msg, isOwner);
            if (!allowed) return;

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "📊", key: msg.key } });
            const { participants, counts, totalMsgs } = await getActivityData(sock, msg.key.remoteJid);
            
            const inactiveUsers = participants.filter(p => counts[p] === 0);
            
            if (inactiveUsers.length === 0) return await sock.sendMessage(msg.key.remoteJid, { text: '✅ Everyone is active!' }, { quoted: msg });
            
            let txt = `👻 *INACTIVE MEMBERS (Ghosts)*\n_Based on activity tracking_\n\n`;
            inactiveUsers.forEach((u, i) => txt += `${i + 1}. @${u.split('@')[0]}\n`);
            await sock.sendMessage(msg.key.remoteJid, { text: txt, mentions: inactiveUsers }, { quoted: msg });
        }
    },
    // ... (മറ്റ് കമാൻഡുകൾ എല്ലാം പഴയത് പോലെ തന്നെ താഴെ കൊടുക്കുക - hidetag, poll, invite etc.)
    {
        name: 'hidetag',
        alias: ['ht'],
        category: 'group',
        description: 'Announce to everyone invisibly',
        usage: '.hidetag <msg>',
        async execute(sock, msg, args, isOwner) {
            const { allowed, meta } = await checkAdminStatus(sock, msg, isOwner);
            if (!allowed) return;

            const participants = meta.participants.map(p => p.id);
            let text = args.join(' ');
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!text && quotedMsg) {
                text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
            }
            if (!text) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ *Provide a message!*' }, { quoted: msg });
            await sock.sendMessage(msg.key.remoteJid, { text: text, mentions: participants });
        }
    },
    {
        name: 'poll',
        category: 'group',
        description: 'Create a poll',
        usage: '.poll Question | Opt1 | Opt2',
        async execute(sock, msg, args) {
            if (!msg.key.remoteJid.endsWith('@g.us')) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Groups only!*' }, { quoted: msg });
            const input = args.join(' ').split('|').map(i => i.trim());
            if (input.length < 3) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Format: .poll Q | Opt1 | Opt2' }, { quoted: msg });
            await sock.sendMessage(msg.key.remoteJid, { poll: { name: input[0], values: input.slice(1), selectableCount: 1 } });
        }
    },
    {
        name: 'invite',
        alias: ['link'],
        category: 'group',
        description: 'Get group link',
        usage: '.invite',
        async execute(sock, msg, args, isOwner) {
            const { allowed } = await checkAdminStatus(sock, msg, isOwner);
            if (!allowed) return;

            try {
                const code = await sock.groupInviteCode(msg.key.remoteJid);
                await sock.sendMessage(msg.key.remoteJid, { text: `🔗 *Group Link:* https://chat.whatsapp.com/${code}` }, { quoted: msg });
            } catch(e) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to fetch link.' }, { quoted: msg });
            }
        }
    },
    {
        name: 'adminlist',
        alias: ['admins'],
        category: 'group',
        description: 'Show group admins',
        usage: '.adminlist',
        async execute(sock, msg) {
            if (!msg.key.remoteJid.endsWith('@g.us')) return;
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const admins = meta.participants.filter(p => p.admin);
            let txt = `🛡️ *GROUP ADMINS (${admins.length})*\n\n` + admins.map((a,i) => `${i+1}. @${a.id.split('@')[0]}`).join('\n');
            await sock.sendMessage(msg.key.remoteJid, { text: txt, mentions: admins.map(a => a.id) }, { quoted: msg });
        }
    },
    {
        name: 'antifake',
        category: 'group',
        description: 'Kick non +91 numbers',
        usage: '.antifake on/off',
        async execute(sock, msg, args, isOwner) {
            const { allowed } = await checkAdminStatus(sock, msg, isOwner);
            if (!allowed) return;

            const action = args[0]?.toLowerCase();
            if (action === 'on') { 
                if (!global.antifakeChats.includes(msg.key.remoteJid)) global.antifakeChats.push(msg.key.remoteJid); 
                saveSettings(); 
            }
            else if (action === 'off') { 
                global.antifakeChats = global.antifakeChats.filter(j => j !== msg.key.remoteJid); 
                saveSettings(); 
            }
            await sock.sendMessage(msg.key.remoteJid, { text: `🛡️ Anti-Fake is now *${global.antifakeChats.includes(msg.key.remoteJid) ? 'ON' : 'OFF'}*` }, { quoted: msg });
        }
    },
    {
        name: 'ginfo',
        alias: ['groupinfo', 'infogroup'],
        category: 'group',
        description: 'Get detailed group information',
        usage: '.ginfo',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            if (!jid.endsWith('@g.us')) return;
            const meta = await sock.groupMetadata(jid);
            const admins = meta.participants.filter(p => p.admin).length;
            const creationDate = new Date(meta.creation * 1000).toLocaleString();
            let txt = `📊 *GROUP INFORMATION*\n\n`;
            txt += `🏷️ *Name:* ${meta.subject}\n`;
            txt += `🆔 *ID:* ${meta.id}\n`;
            txt += `👑 *Owner:* @${meta.owner ? meta.owner.split('@')[0] : 'Unknown'}\n`;
            txt += `👥 *Members:* ${meta.participants.length}\n`;
            txt += `🛡️ *Admins:* ${admins}\n`;
            txt += `📅 *Created On:* ${creationDate}\n\n`;
            txt += `📝 *Description:*\n${meta.desc || 'No description available.'}`;
            
            await sock.sendMessage(jid, { text: txt, mentions: [meta.owner] }, { quoted: msg });
        }
    },
    {
        name: 'revoke',
        alias: ['resetlink'],
        category: 'group',
        description: 'Reset group invite link',
        usage: '.revoke',
        async execute(sock, msg, args, isOwner) {
            const { allowed } = await checkAdminStatus(sock, msg, isOwner);
            if (!allowed) return;
            try {
                await sock.groupRevokeInvite(msg.key.remoteJid);
                await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Group link has been successfully reset!*' }, { quoted: msg });
            } catch (err) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Failed to reset link.*' }, { quoted: msg });
            }
        }
    },
    {
        name: 'tagadmins',
        alias: ['adminsonly'],
        category: 'group',
        description: 'Tag all group admins',
        usage: '.tagadmins <message>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            if (!jid.endsWith('@g.us')) return;
            const meta = await sock.groupMetadata(jid);
            const admins = meta.participants.filter(p => p.admin).map(a => a.id);
            let text = args.join(' ') || "Attention Admins!";
            await sock.sendMessage(jid, { text: `🛡️ *ADMIN PING* 🛡️\n\n📢 ${text}`, mentions: admins }, { quoted: msg });
        }
    },
    {
        name: 'kickall',
        category: 'group',
        description: 'Kick all non-admin members',
        usage: '.kickall',
        async execute(sock, msg, args, isOwner) {
            const { allowed, meta } = await checkAdminStatus(sock, msg, isOwner);
            if (!allowed) return;
            
            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Only the Bot Owner can use this dangerous command!*' }, { quoted: msg });

            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const nonAdmins = meta.participants.filter(p => !p.admin && p.id !== botJid).map(p => p.id);
            if (nonAdmins.length === 0) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ *No normal members to kick!*' }, { quoted: msg });

            await sock.sendMessage(msg.key.remoteJid, { text: `☢️ *NUKE INITIATED!* Kicking ${nonAdmins.length} members...` }, { quoted: msg });
            
            try {
                await sock.groupParticipantsUpdate(msg.key.remoteJid, nonAdmins, 'remove');
                await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Cleaned! All non-admins have been removed.*' });
            } catch (err) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Error kicking members. WhatsApp might have rate-limited the bot.*' });
            }
        }
    },
    {
        name: 'demoteall',
        category: 'group',
        description: 'Demote all group admins',
        usage: '.demoteall',
        async execute(sock, msg, args, isOwner) {
            const { allowed, meta } = await checkAdminStatus(sock, msg, isOwner);
            if (!allowed) return;

            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Only the Bot Owner can use this command!*' }, { quoted: msg });

            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const admins = meta.participants.filter(p => p.admin && p.id !== botJid && p.id !== meta.owner).map(p => p.id);
            if (admins.length === 0) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ *No other admins to demote!*' }, { quoted: msg });

            try {
                await sock.groupParticipantsUpdate(msg.key.remoteJid, admins, 'demote');
                await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Successfully demoted ${admins.length} admins!*` });
            } catch (err) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Failed to demote admins.*' });
            }
        }
    },
    {
        name: 'leave',
        alias: ['left'],
        category: 'group',
        description: 'Make bot leave the group',
        usage: '.leave',
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            if (!jid.endsWith('@g.us')) return;
            
            if (!isOwner) return await sock.sendMessage(jid, { text: '❌ *Only my Owner can command me to leave!*' }, { quoted: msg });

            await sock.sendMessage(jid, { text: '👋 *Goodbye everyone! KIRA X MD is leaving...*' });
            await sock.groupLeave(jid);
        }
    }
];

// ─── Event Listener for Antifake & Message Tracking ───
module.exports.initGroupEvents = async function(sock) {
    
    // 1. Message Tracker (ഇതാണ് പുതിയത്!)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return; // ഗ്രൂപ്പുകളിൽ മാത്രം

            const sender = m.key.participant;
            if (!sender) return;

            // ഡാറ്റാബേസിൽ കൗണ്ട് കൂട്ടുന്നു
            if (!activityDb[jid]) activityDb[jid] = {};
            if (!activityDb[jid][sender]) activityDb[jid][sender] = 0;
            
            activityDb[jid][sender]++;
            saveActivity();
        } catch (e) {
            console.log("Activity tracker error:", e);
        }
    });

    // 2. Antifake System
    sock.ev.on('group-participants.update', async (update) => {
        try {
            loadSettings();
            if (update.action !== 'add' || !global.antifakeChats.includes(update.id)) return;
            
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const meta = await sock.groupMetadata(update.id);
            const isBotAdmin = meta.participants.some(p => p.id === botJid && p.admin);
            if (!isBotAdmin) return;

            const fakeUsers = update.participants.filter(p => !p.startsWith('91'));
            if (fakeUsers.length > 0) {
                await sock.groupParticipantsUpdate(update.id, fakeUsers, 'remove');
            }
        } catch(e) {
            console.error("Anti-fake event error:", e);
        }
    });
};