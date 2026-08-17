// plugins/antipromote.js – KIRA X MD
// Anti-Promote & Anti-Demote
//
// IMPORTANT:
// - Never demotes/promotes the person who performed the action.
// - Only reverses the affected participant(s).
// - Includes loop protection.
// - Settings are stored per bot number.

const { getSettings, updateSetting } = require('../lib/database');

// Prevent the bot's own reversal from triggering another reversal
const recentReverts = new Map();

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function getBotNumber(sock) {
    return sock.user?.id
        ?.split(':')[0]
        ?.replace(/[^0-9]/g, '') || '';
}

function normalizeJid(jid) {
    if (!jid) return '';
    return jid.includes('@')
        ? jid
        : `${jid}@s.whatsapp.net`;
}

function getPhone(jid) {
    if (!jid) return '';
    return jid.split('@')[0].replace(/[^0-9]/g, '');
}

/*
 * Convert a participant object into a usable WhatsApp JID.
 *
 * Baileys can sometimes give LID IDs, so phoneNumber is preferred
 * whenever available.
 */
function participantToJid(participant) {
    if (!participant) return '';

    if (participant.phoneNumber) {
        return normalizeJid(participant.phoneNumber);
    }

    if (participant.id && !participant.id.includes('@lid')) {
        return normalizeJid(participant.id);
    }

    return '';
}

/*
 * Loop protection.
 *
 * Example:
 *
 * User promotes B
 *      ↓
 * Bot demotes B
 *      ↓
 * WhatsApp sends another event
 *      ↓
 * We recognize it as our own reversal
 *      ↓
 * STOP
 */
function markBotAction(jid, action, participants) {
    const now = Date.now();

    for (const participant of participants) {
        const key = `${jid}:${action}:${participant}`;

        recentReverts.set(key, now);

        // Cleanup after 10 seconds
        setTimeout(() => {
            recentReverts.delete(key);
        }, 10000);
    }
}

function isBotAction(jid, action, participants) {
    const now = Date.now();

    return participants.every(participant => {
        const key = `${jid}:${action}:${participant}`;
        const timestamp = recentReverts.get(key);

        if (!timestamp) return false;

        if (now - timestamp > 10000) {
            recentReverts.delete(key);
            return false;
        }

        return true;
    });
}

/* ─────────────────────────────────────────────
   TOGGLE COMMAND
───────────────────────────────────────────── */

async function handleToggle(sock, msg, args, isOwner, type) {
    const jid = msg.key.remoteJid;

    if (!isOwner) {
        return sock.sendMessage(
            jid,
            { text: '❌ *Owner only command!*' },
            { quoted: msg }
        );
    }

    if (!jid?.endsWith('@g.us')) {
        return sock.sendMessage(
            jid,
            { text: '❌ *This command only works in groups!*' },
            { quoted: msg }
        );
    }

    const botNumber = getBotNumber(sock);
    const config = getSettings(botNumber);

    const isPromote = type === 'promote';

    const dbKey = isPromote
        ? 'antiPromoteChats'
        : 'antiDemoteChats';

    const displayName = isPromote
        ? 'Anti-Promote'
        : 'Anti-Demote';

    let chats = Array.isArray(config[dbKey])
        ? [...config[dbKey]]
        : [];

    const action = String(args?.[0] || '').toLowerCase();

    /* ON */

    if (action === 'on') {
        if (chats.includes(jid)) {
            return sock.sendMessage(
                jid,
                {
                    text: `⚠️ *${displayName} is already enabled.*`
                },
                { quoted: msg }
            );
        }

        chats.push(jid);

        updateSetting(
            botNumber,
            dbKey,
            chats
        );

        return sock.sendMessage(
            jid,
            {
                text:
                    `🛡️ *${displayName} Enabled*\n\n` +
                    `Any ${isPromote ? 'promotion' : 'demotion'} will be automatically reverted.`
            },
            { quoted: msg }
        );
    }

    /* OFF */

    if (action === 'off') {
        chats = chats.filter(x => x !== jid);

        updateSetting(
            botNumber,
            dbKey,
            chats
        );

        return sock.sendMessage(
            jid,
            {
                text: `🔴 *${displayName} Disabled*`
            },
            { quoted: msg }
        );
    }

    /* STATUS */

    const enabled = chats.includes(jid);

    return sock.sendMessage(
        jid,
        {
            text:
                `🛡️ *${displayName}*\n\n` +
                `Status: ${enabled ? '🟢 ON' : '🔴 OFF'}\n\n` +
                `➤ .${isPromote ? 'antipromote' : 'antidemote'} on\n` +
                `➤ .${isPromote ? 'antipromote' : 'antidemote'} off`
        },
        { quoted: msg }
    );
}

/* ─────────────────────────────────────────────
   COMMANDS
───────────────────────────────────────────── */

const commands = [
    {
        name: 'antipromote',
        alias: ['ap'],
        category: 'owner',
        description: 'Automatically revert promotions',
        usage: '.antipromote on/off',

        async execute(sock, msg, args, isOwner) {
            return handleToggle(
                sock,
                msg,
                args,
                isOwner,
                'promote'
            );
        }
    },

    {
        name: 'antidemote',
        alias: ['ad'],
        category: 'owner',
        description: 'Automatically revert demotions',
        usage: '.antidemote on/off',

        async execute(sock, msg, args, isOwner) {
            return handleToggle(
                sock,
                msg,
                args,
                isOwner,
                'demote'
            );
        }
    }
];

/* ─────────────────────────────────────────────
   EVENT LISTENER
───────────────────────────────────────────── */

async function initAntiPromoteListener(sock) {

    // Prevent duplicate listeners if this function
    // accidentally gets called more than once.
    if (sock.__kiraAntiPromoteListener) {
        return;
    }

    sock.__kiraAntiPromoteListener = true;

    sock.ev.on(
        'group-participants.update',
        async update => {

            try {

                const jid = update?.id;
                const action = update?.action;
                const participants = update?.participants || [];

                if (!jid?.endsWith('@g.us')) return;

                // Only care about these two events
                if (
                    action !== 'promote' &&
                    action !== 'demote'
                ) {
                    return;
                }

                if (!participants.length) return;

                const botNumber = getBotNumber(sock);

                if (!botNumber) return;

                const config = getSettings(botNumber);

                const enabledList =
                    action === 'promote'
                        ? (config.antiPromoteChats || [])
                        : (config.antiDemoteChats || []);

                // Protection isn't enabled for this group
                if (!enabledList.includes(jid)) {
                    return;
                }

                /*
                 * Convert only the TARGET participants.
                 *
                 * update.author is intentionally NEVER used
                 * for the reversal.
                 */
                const targetUsers = participants
                    .map(participantToJid)
                    .filter(Boolean);

                if (!targetUsers.length) {
                    console.log(
                        '⚠️ AntiPromote: Could not resolve target participant.'
                    );
                    return;
                }

                /*
                 * Check whether this event was caused by our
                 * own previous reversal.
                 */
                if (
                    isBotAction(
                        jid,
                        action,
                        targetUsers
                    )
                ) {
                    return;
                }

                /*
                 * Determine the opposite action.
                 *
                 * promote → demote
                 * demote  → promote
                 */
                const reverseAction =
                    action === 'promote'
                        ? 'demote'
                        : 'promote';

                console.log(
                    `🛡️ Anti-${action}: Reverting`,
                    targetUsers
                );

                /*
                 * IMPORTANT:
                 *
                 * We ONLY send targetUsers here.
                 *
                 * We NEVER send update.author.
                 *
                 * Therefore:
                 *
                 * A promotes B
                 * → B gets demoted
                 * → A is untouched
                 *
                 * A demotes B
                 * → B gets promoted
                 * → A is untouched
                 */
                markBotAction(
                    jid,
                    reverseAction,
                    targetUsers
                );

                try {

                    await sock.groupParticipantsUpdate(
                        jid,
                        targetUsers,
                        reverseAction
                    );

                    console.log(
                        `✅ Anti-${action}: Successfully restored ${targetUsers.length} participant(s).`
                    );

                    /*
                     * Optional security message.
                     *
                     * We don't mention the author because
                     * the important thing is that the target
                     * was restored.
                     */
                    await sock.sendMessage(jid, {
                        text:
                            `🛡️ *Anti-${action === 'promote' ? 'Promote' : 'Demote'}*\n\n` +
                            `The ${action} action was automatically reverted.`
                    });

                } catch (revertError) {

                    console.error(
                        `❌ Anti-${action} revert failed:`,
                        revertError?.message || revertError
                    );

                }

            } catch (error) {

                console.error(
                    '❌ AntiPromote listener error:',
                    error?.message || error
                );

            }

        }
    );

    console.log('🛡️ KIRA Anti-Promote/Anti-Demote listener initialized.');
}

module.exports = [
    ...commands,
    {
        initAntiPromote: initAntiPromoteListener
    }
];