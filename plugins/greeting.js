// plugins/greeting.js - KIRA X MD (Rich Placeholders & Greeting Handler)
const fs = require('fs');
const path = require('path');
const { getSettings } = require('../lib/database');

const dataFilePath = path.join(__dirname, '../temp/greeting_data.json');

function getGreetingData() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const initial = { 
                welcomeEnabled: [], 
                goodbyeEnabled: [], 
                welcomeMessages: {}, 
                goodbyeMessages: {} 
            };
            fs.writeFileSync(dataFilePath, JSON.stringify(initial, null, 2));
            return initial;
        }
        return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    } catch {
        return { welcomeEnabled: [], goodbyeEnabled: [], welcomeMessages: {}, goodbyeMessages: {} };
    }
}

function saveGreetingData(data) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────
// 1. GREETING EVENT LISTENER
// ─────────────────────────────────────────
function initGreeting(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            const data = getGreetingData();

            const groupMeta = await sock.groupMetadata(id).catch(() => null);
            if (!groupMeta) return;

            const groupName = groupMeta.subject || "Group";
            const memberCount = groupMeta.participants?.length || 0;
            const groupDesc = groupMeta.desc?.toString() || "No description set.";
            const groupOwner = groupMeta.owner ? groupMeta.owner.split('@')[0] : "Unknown";

            // Bot details
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
            const botSettings = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};
            const botName = botSettings.botName || process.env.BOT_NAME || "KIRA X MD";

            // Time & Date format
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' });

            // Fetch Group DP
            let groupDpUrl = 'https://files.catbox.moe/22x0j5.jpeg';
            try {
                groupDpUrl = await sock.profilePictureUrl(id, 'image');
            } catch {}

            // ── WELCOME HANDLER ──
            if (action === 'add' && data.welcomeEnabled.includes(id)) {
                for (const userJid of participants) {
                    const username = userJid.split('@')[0];

                    let caption = "";
                    if (data.welcomeMessages[id]) {
                        caption = data.welcomeMessages[id]
                            .replace(/@user/gi, `@${username}`)
                            .replace(/@group/gi, groupName)
                            .replace(/@count/gi, memberCount)
                            .replace(/@desc/gi, groupDesc)
                            .replace(/@time/gi, timeStr)
                            .replace(/@date/gi, dateStr)
                            .replace(/@owner/gi, `@${groupOwner}`)
                            .replace(/@bot/gi, botName);
                    } else {
                        // Default Clean Card
                        caption = `─── ❖ WELCOME ❖ ───\n\n` +
                                  `  • ᴜsᴇʀ    : @${username}\n` +
                                  `  • ɢʀᴏᴜᴘ   : ${groupName}\n` +
                                  `  • ᴍᴇᴍʙᴇʀ  : #${memberCount}\n` +
                                  `  • ᴛɪᴍᴇ    : ${timeStr}\n` +
                                  `  • ᴅᴀᴛᴇ    : ${dateStr}\n\n` +
                                  `  welcome to the group. check the description\n` +
                                  `  and keep the chat active.\n\n` +
                                  `───────────────────`;
                    }

                    // Mention list for tags
                    const mentions = [userJid];
                    if (groupMeta.owner && caption.includes(`@${groupOwner}`)) {
                        mentions.push(groupMeta.owner);
                    }

                    await sock.sendMessage(id, {
                        image: { url: groupDpUrl },
                        caption: caption,
                        mentions: mentions
                    });
                }
            }

        } catch (err) {
            console.error("Greeting Event Error:", err.message);
        }
    });
}

// ─────────────────────────────────────────
// 2. COMMAND HANDLER (.welcome & .setwelcome)
// ─────────────────────────────────────────
module.exports = {
    name: 'welcome',
    alias: ['setwelcome'],
    category: 'group',
    description: 'Configure welcome messages with extended placeholders',
    usage: '.welcome on | .welcome off | .setwelcome <text>',

    initGreeting,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith('@g.us')) {
            return await sock.sendMessage(jid, { text: "❌ *This command can only be used in groups!*" }, { quoted: msg });
        }

        const sender = msg.key.participant || msg.key.remoteJid;
        const groupMetadata = await sock.groupMetadata(jid);
        const isAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isAdmin && !isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
        }

        const data = getGreetingData();
        const rawText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const commandUsed = rawText.trim().split(/\s+/)[0].slice(1).toLowerCase();

        // Direct .setwelcome handling
        if (commandUsed === 'setwelcome') {
            const customMsg = args.join(" ").trim();
            if (!customMsg) {
                return await sock.sendMessage(jid, { 
                    text: `⚠️ *Please provide a custom message!*\n\n` +
                          `*Available Placeholders:*\n` +
                          `• *@user* : Mentions the new member\n` +
                          `• *@group* : Group title\n` +
                          `• *@count* : Total group members\n` +
                          `• *@desc* : Group description\n` +
                          `• *@time* : Current time (e.g. 03:50 PM)\n` +
                          `• *@date* : Current date (e.g. 06/09/2026)\n` +
                          `• *@owner* : Tags group creator\n` +
                          `• *@bot* : Active bot name`
                }, { quoted: msg });
            }

            data.welcomeMessages[jid] = customMsg;
            if (!data.welcomeEnabled.includes(jid)) data.welcomeEnabled.push(jid);
            saveGreetingData(data);

            return await sock.sendMessage(jid, { text: "✅ *Custom welcome message configured and enabled!*" }, { quoted: msg });
        }

        const subCmd = (args[0] || "").toLowerCase();

        if (subCmd === "on") {
            if (!data.welcomeEnabled.includes(jid)) data.welcomeEnabled.push(jid);
            saveGreetingData(data);
            return await sock.sendMessage(jid, { text: "✅ *Welcome message enabled for this group!*" }, { quoted: msg });
        }

        if (subCmd === "off") {
            data.welcomeEnabled = data.welcomeEnabled.filter(id => id !== jid);
            saveGreetingData(data);
            return await sock.sendMessage(jid, { text: "🚫 *Welcome message disabled for this group!*" }, { quoted: msg });
        }

        if (subCmd === "set") {
            const customMsg = args.slice(1).join(" ").trim();
            if (!customMsg) {
                return await sock.sendMessage(jid, { text: `⚠️ *Usage:* .welcome set <message with placeholders>` }, { quoted: msg });
            }

            data.welcomeMessages[jid] = customMsg;
            if (!data.welcomeEnabled.includes(jid)) data.welcomeEnabled.push(jid);
            saveGreetingData(data);

            return await sock.sendMessage(jid, { text: "✅ *Custom welcome message saved and activated!*" }, { quoted: msg });
        }

        if (subCmd === "reset") {
            delete data.welcomeMessages[jid];
            saveGreetingData(data);
            return await sock.sendMessage(jid, { text: "✅ *Welcome message reset to default card!*" }, { quoted: msg });
        }

        return await sock.sendMessage(jid, {
            text: `⚙️ *WELCOME SYSTEM CONFIG*\n\n` +
                  `• *.welcome on* - Enable welcome\n` +
                  `• *.welcome off* - Disable welcome\n` +
                  `• *.welcome set <text>* - Set message\n` +
                  `• *.setwelcome <text>* - Shortcut set\n` +
                  `• *.welcome reset* - Revert to default\n\n` +
                  `*All Placeholders:*\n` +
                  `@user, @group, @count, @desc, @time, @date, @owner, @bot`
        }, { quoted: msg });
    }
};

