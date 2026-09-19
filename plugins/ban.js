// plugins/ban.js – KIRA X MD
// Bot-specific Ban / Unban System

const { getSettings, updateSetting } = require('../lib/database');

// ======================================================
// HELPERS
// ======================================================

function cleanNumber(value = '') {
    return String(value).replace(/[^0-9]/g, '');
}

function getBotNumber(sock) {
    if (!sock?.user?.id) return '';

    return cleanNumber(
        sock.user.id.split(':')[0].split('@')[0]
    );
}

function getSenderJid(msg) {
    return (
        msg.key.participant ||
        msg.key.remoteJid ||
        ''
    );
}

function getSenderNumber(msg) {
    return cleanNumber(getSenderJid(msg));
}

function getOwnerNumber() {
    return cleanNumber(process.env.OWNER_NUMBER || '');
}

function isOwner(sock, msg) {
    const senderNumber = getSenderNumber(msg);
    const botNumber = getBotNumber(sock);
    const ownerNumber = getOwnerNumber();

    // Main bot itself
    if (msg.key.fromMe) return true;

    // Bot's own number
    if (senderNumber && botNumber && senderNumber === botNumber) {
        return true;
    }

    // Main owner
    if (senderNumber && ownerNumber && senderNumber === ownerNumber) {
        return true;
    }

    return false;
}

// ======================================================
// FIND TARGET USER
// ======================================================

function getTargetUser(msg) {
    const context =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo ||
        msg.message?.documentMessage?.contextInfo ||
        {};

    // 1. Mention
    const mentioned = context.mentionedJid || [];

    if (mentioned.length > 0) {
        return mentioned[0];
    }

    // 2. Quoted message sender
    if (context.participant) {
        return context.participant;
    }

    return null;
}

// ======================================================
// SAVE BAN DATA
// ======================================================

function addToList(list, value) {
    if (!list.includes(value)) {
        list.push(value);
        return true;
    }

    return false;
}

function removeFromList(list, value) {
    const index = list.indexOf(value);

    if (index !== -1) {
        list.splice(index, 1);
        return true;
    }

    return false;
}

// ======================================================
// BAN
// ======================================================

async function banExecute(sock, msg) {
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');

    // Owner check
    if (!isOwner(sock, msg)) {
        return sock.sendMessage(
            jid,
            {
                text: '❌ *Owner only command!*'
            },
            { quoted: msg }
        );
    }

    // Get THIS bot's database
    const botNumber = getBotNumber(sock);

    if (!botNumber) {
        return sock.sendMessage(
            jid,
            {
                text: '❌ *Could not identify this bot.*'
            },
            { quoted: msg }
        );
    }

    const settings = getSettings(botNumber);

    // ==================================================
    // USER BAN
    // ==================================================

    const targetUser = getTargetUser(msg);

    if (targetUser) {
        const target = targetUser;

        // Don't allow banning the bot itself
        if (cleanNumber(target) === botNumber) {
            return sock.sendMessage(
                jid,
                {
                    text: '❌ *I cannot ban myself.*'
                },
                { quoted: msg }
            );
        }

        // Don't allow banning main owner
        const ownerNumber = getOwnerNumber();

        if (
            ownerNumber &&
            cleanNumber(target) === ownerNumber
        ) {
            return sock.sendMessage(
                jid,
                {
                    text: '❌ *You cannot ban the bot owner.*'
                },
                { quoted: msg }
            );
        }

        if (!settings.bannedUsers.includes(target)) {
            settings.bannedUsers.push(target);

            updateSetting(
                botNumber,
                'bannedUsers',
                settings.bannedUsers
            );

            return sock.sendMessage(
                jid,
                {
                    text:
                        `🚫 *USER BANNED*\n\n` +
                        `👤 @${cleanNumber(target)}\n` +
                        `🤖 Bot: ${botNumber}\n\n` +
                        `This user can no longer use this bot.`,
                    mentions: [target]
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            jid,
            {
                text: '⚠️ *This user is already banned from this bot!*'
            },
            { quoted: msg }
        );
    }

    // ==================================================
    // GROUP BAN
    // ==================================================

    if (isGroup) {
        if (!settings.bannedGroups.includes(jid)) {
            settings.bannedGroups.push(jid);

            updateSetting(
                botNumber,
                'bannedGroups',
                settings.bannedGroups
            );

            return sock.sendMessage(
                jid,
                {
                    text:
                        `🚫 *GROUP BANNED*\n\n` +
                        `🤖 Bot: ${botNumber}\n\n` +
                        `I will no longer respond to commands in this group.`
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            jid,
            {
                text: '⚠️ *This group is already banned from this bot!*'
            },
            { quoted: msg }
        );
    }

    // ==================================================
    // DM BAN
    // ==================================================

    if (!isGroup) {
        const target = jid;

        if (cleanNumber(target) === botNumber) {
            return sock.sendMessage(
                jid,
                {
                    text: '❌ *I cannot ban myself.*'
                },
                { quoted: msg }
            );
        }

        if (!settings.bannedUsers.includes(target)) {
            settings.bannedUsers.push(target);

            updateSetting(
                botNumber,
                'bannedUsers',
                settings.bannedUsers
            );

            return sock.sendMessage(
                jid,
                {
                    text:
                        `🚫 *DM BANNED*\n\n` +
                        `🤖 Bot: ${botNumber}\n\n` +
                        `I will no longer respond to this DM.`
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            jid,
            {
                text: '⚠️ *This DM is already banned from this bot!*'
            },
            { quoted: msg }
        );
    }
}

// ======================================================
// UNBAN
// ======================================================

async function unbanExecute(sock, msg) {
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');

    // Owner check
    if (!isOwner(sock, msg)) {
        return sock.sendMessage(
            jid,
            {
                text: '❌ *Owner only command!*'
            },
            { quoted: msg }
        );
    }

    const botNumber = getBotNumber(sock);

    if (!botNumber) {
        return sock.sendMessage(
            jid,
            {
                text: '❌ *Could not identify this bot.*'
            },
            { quoted: msg }
        );
    }

    const settings = getSettings(botNumber);

    // ==================================================
    // USER UNBAN
    // ==================================================

    const targetUser = getTargetUser(msg);

    if (targetUser) {
        const removed = removeFromList(
            settings.bannedUsers,
            targetUser
        );

        if (removed) {
            updateSetting(
                botNumber,
                'bannedUsers',
                settings.bannedUsers
            );

            return sock.sendMessage(
                jid,
                {
                    text:
                        `✅ *USER UNBANNED*\n\n` +
                        `👤 @${cleanNumber(targetUser)}\n` +
                        `🤖 Bot: ${botNumber}\n\n` +
                        `This user can use the bot again.`,
                    mentions: [targetUser]
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            jid,
            {
                text: '⚠️ *This user is not banned from this bot!*'
            },
            { quoted: msg }
        );
    }

    // ==================================================
    // GROUP UNBAN
    // ==================================================

    if (isGroup) {
        const removed = removeFromList(
            settings.bannedGroups,
            jid
        );

        if (removed) {
            updateSetting(
                botNumber,
                'bannedGroups',
                settings.bannedGroups
            );

            return sock.sendMessage(
                jid,
                {
                    text:
                        `✅ *GROUP UNBANNED*\n\n` +
                        `🤖 Bot: ${botNumber}\n\n` +
                        `I will accept commands in this group again.`
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            jid,
            {
                text: '⚠️ *This group is not banned from this bot!*'
            },
            { quoted: msg }
        );
    }

    // ==================================================
    // DM UNBAN
    // ==================================================

    const target = jid;

    const removed = removeFromList(
        settings.bannedUsers,
        target
    );

    if (removed) {
        updateSetting(
            botNumber,
            'bannedUsers',
            settings.bannedUsers
        );

        return sock.sendMessage(
            jid,
            {
                text:
                    `✅ *DM UNBANNED*\n\n` +
                    `🤖 Bot: ${botNumber}\n\n` +
                    `This DM can use the bot again.`
            },
            { quoted: msg }
        );
    }

    return sock.sendMessage(
        jid,
        {
            text: '⚠️ *This DM is not banned from this bot!*'
        },
        { quoted: msg }
    );
}

// ======================================================
// EXPORT
// ======================================================

module.exports = [
    {
        name: 'ban',
        alias: ['blockbot'],
        category: 'owner',
        description: 'Ban a user, group, or DM from this bot',

        async execute(sock, msg, args) {
            return banExecute(sock, msg);
        }
    },

    {
        name: 'unban',
        alias: ['unblockbot'],
        category: 'owner',
        description: 'Unban a user, group, or DM from this bot',

        async execute(sock, msg, args) {
            return unbanExecute(sock, msg);
        }
    }
];