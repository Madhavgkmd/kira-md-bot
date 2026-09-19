// plugins/ban.js – KIRA X MD (Smart Ban System)
const { getSettings, updateSetting } = require('../lib/database');

module.exports = [
    {
        name: 'ban',
        alias: ['blockbot'],
        category: 'owner',
        description: 'Ban a user, group, or DM from this bot',

        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');

            // ─── Owner Check ───
            const sender = msg.key.participant || msg.key.remoteJid;
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
            const ownerNum = String(process.env.OWNER_NUMBER || global.config?.OWNER_NUMBER || "").replace(/[^0-9]/g, "");
            
            if (!isOwner && sender.replace(/[^0-9]/g, "") !== ownerNum && !msg.key.fromMe) {
                return await sock.sendMessage(jid, { text: '❌ *Owner only command!*' }, { quoted: msg });
            }

            // ─── SAFEGUARD: DB Array Initialization ───
            const settings = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};
            if (!Array.isArray(settings.bannedUsers)) settings.bannedUsers = [];
            if (!Array.isArray(settings.bannedGroups)) settings.bannedGroups = [];

            // ─── Get Target (Mention / Reply / Args) ───
            let target = null;
            const context = msg.message?.extendedTextMessage?.contextInfo || {};

            if (context.mentionedJid && context.mentionedJid.length > 0) {
                target = context.mentionedJid[0];
            } else if (context.participant) {
                target = context.participant;
            } else if (args && args.length > 0) {
                const phone = args[0].replace(/[^0-9]/g, '');
                if (phone.length >= 10) target = phone + '@s.whatsapp.net';
            }

            // ==========================================
            // 1. BAN USER (Target exists)
            // ==========================================
            if (target) {
                if (target.startsWith(botNumber)) return await sock.sendMessage(jid, { text: '❌ *I cannot ban myself!*' }, { quoted: msg });
                if (ownerNum && target.startsWith(ownerNum)) return await sock.sendMessage(jid, { text: '❌ *You cannot ban the main bot owner!*' }, { quoted: msg });

                if (!settings.bannedUsers.includes(target)) {
                    settings.bannedUsers.push(target);
                    if(typeof updateSetting === 'function') updateSetting(botNumber, 'bannedUsers', settings.bannedUsers);

                    return await sock.sendMessage(jid, {
                        text: `🚫 *USER BANNED*\n\n👤 @${target.split('@')[0]}\n🤖 Bot: ${botNumber}\n\nThis user is now blocked from using the bot.`,
                        mentions: [target]
                    }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: '⚠️ *This user is already banned!*' }, { quoted: msg });
                }
            }

            // ==========================================
            // 2. BAN GROUP (No target, inside group)
            // ==========================================
            if (isGroup) {
                if (!settings.bannedGroups.includes(jid)) {
                    settings.bannedGroups.push(jid);
                    if(typeof updateSetting === 'function') updateSetting(botNumber, 'bannedGroups', settings.bannedGroups);

                    return await sock.sendMessage(jid, {
                        text: `🚫 *GROUP BANNED*\n\n🤖 Bot: ${botNumber}\n\nI will no longer respond to commands in this group.`
                    }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: '⚠️ *This group is already banned!*' }, { quoted: msg });
                }
            }

            // ==========================================
            // 3. BAN DM (No target, inside PM)
            // ==========================================
            if (!isGroup) {
                if (jid.startsWith(botNumber)) return await sock.sendMessage(jid, { text: '❌ *I cannot ban myself!*' }, { quoted: msg });

                if (!settings.bannedUsers.includes(jid)) {
                    settings.bannedUsers.push(jid);
                    if(typeof updateSetting === 'function') updateSetting(botNumber, 'bannedUsers', settings.bannedUsers);

                    return await sock.sendMessage(jid, {
                        text: `🚫 *DM BANNED*\n\n🤖 Bot: ${botNumber}\n\nI will no longer respond to this DM.`
                    }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: '⚠️ *This DM is already banned!*' }, { quoted: msg });
                }
            }
        }
    },
    
    // ==========================================
    // UNBAN COMMAND
    // ==========================================
    {
        name: 'unban',
        alias: ['unblockbot'],
        category: 'owner',
        description: 'Unban a user, group, or DM from this bot',

        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');

            const sender = msg.key.participant || msg.key.remoteJid;
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
            const ownerNum = String(process.env.OWNER_NUMBER || global.config?.OWNER_NUMBER || "").replace(/[^0-9]/g, "");
            
            if (!isOwner && sender.replace(/[^0-9]/g, "") !== ownerNum && !msg.key.fromMe) {
                return await sock.sendMessage(jid, { text: '❌ *Owner only command!*' }, { quoted: msg });
            }

            const settings = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};
            if (!Array.isArray(settings.bannedUsers)) settings.bannedUsers = [];
            if (!Array.isArray(settings.bannedGroups)) settings.bannedGroups = [];

            let target = null;
            const context = msg.message?.extendedTextMessage?.contextInfo || {};

            if (context.mentionedJid && context.mentionedJid.length > 0) {
                target = context.mentionedJid[0];
            } else if (context.participant) {
                target = context.participant;
            } else if (args && args.length > 0) {
                const phone = args[0].replace(/[^0-9]/g, '');
                if (phone.length >= 10) target = phone + '@s.whatsapp.net';
            }

            // 1. UNBAN USER
            if (target) {
                const index = settings.bannedUsers.indexOf(target);
                if (index !== -1) {
                    settings.bannedUsers.splice(index, 1);
                    if(typeof updateSetting === 'function') updateSetting(botNumber, 'bannedUsers', settings.bannedUsers);

                    return await sock.sendMessage(jid, {
                        text: `✅ *USER UNBANNED*\n\n👤 @${target.split('@')[0]}\n🤖 Bot: ${botNumber}\n\nThis user can use the bot again.`,
                        mentions: [target]
                    }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: '⚠️ *This user is not banned!*' }, { quoted: msg });
                }
            }

            // 2. UNBAN GROUP
            if (isGroup) {
                const index = settings.bannedGroups.indexOf(jid);
                if (index !== -1) {
                    settings.bannedGroups.splice(index, 1);
                    if(typeof updateSetting === 'function') updateSetting(botNumber, 'bannedGroups', settings.bannedGroups);

                    return await sock.sendMessage(jid, {
                        text: `✅ *GROUP UNBANNED*\n\n🤖 Bot: ${botNumber}\n\nI will accept commands in this group again.`
                    }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: '⚠️ *This group is not banned!*' }, { quoted: msg });
                }
            }

            // 3. UNBAN DM
            if (!isGroup) {
                const index = settings.bannedUsers.indexOf(jid);
                if (index !== -1) {
                    settings.bannedUsers.splice(index, 1);
                    if(typeof updateSetting === 'function') updateSetting(botNumber, 'bannedUsers', settings.bannedUsers);

                    return await sock.sendMessage(jid, {
                        text: `✅ *DM UNBANNED*\n\n🤖 Bot: ${botNumber}\n\nThis DM can use the bot again.`
                    }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: '⚠️ *This DM is not banned!*' }, { quoted: msg });
                }
            }
        }
    }
];