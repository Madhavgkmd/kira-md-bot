// plugins/greeting.js - KIRA X MD (Ultimate Welcome & Goodbye System)
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
            if (action !== 'add' && action !== 'remove') return;

            const data = getGreetingData();
            if (!data.welcomeEnabled.includes(id) && !data.goodbyeEnabled.includes(id)) return;

            const groupMeta = await sock.groupMetadata(id).catch(() => null);
            if (!groupMeta) return;

            const groupName = groupMeta.subject || "Group";
            const memberCount = groupMeta.participants?.length || 0;
            const groupDesc = groupMeta.desc?.toString() || "No description set.";
            const groupOwner = groupMeta.owner ? groupMeta.owner.split('@')[0] : "Unknown";

            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
            const botSettings = typeof getSettings === 'function' ? (getSettings(botNumber) || {}) : {};
            const botName = botSettings.botName || process.env.BOT_NAME || "KIRA X MD";

            // Time, Date & Greeting format
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' });
            const dayStr = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
            
            const hour = parseInt(now.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }));
            let timeGreeting = "Good Evening";
            if (hour >= 5 && hour < 12) timeGreeting = "Good Morning";
            else if (hour >= 12 && hour < 17) timeGreeting = "Good Afternoon";

            // Fetch Group DP
            let groupDpUrl = 'https://files.catbox.moe/22x0j5.jpeg';
            try {
                groupDpUrl = await sock.profilePictureUrl(id, 'image');
            } catch {}

            for (const userJid of participants) {
                const username = userJid.split('@')[0];
                let caption = "";

                // Replace Placeholders Function
                const parsePlaceholders = (text) => {
                    return text
                        .replace(/@user/gi, `@${username}`)
                        .replace(/@uname/gi, username)
                        .replace(/@group/gi, groupName)
                        .replace(/@count/gi, memberCount)
                        .replace(/@desc/gi, groupDesc)
                        .replace(/@time/gi, timeStr)
                        .replace(/@date/gi, dateStr)
                        .replace(/@day/gi, dayStr)
                        .replace(/@greeting/gi, timeGreeting)
                        .replace(/@owner/gi, `@${groupOwner}`)
                        .replace(/@bot/gi, botName);
                };

                // ── WELCOME HANDLER ──
                if (action === 'add' && data.welcomeEnabled.includes(id)) {
                    if (data.welcomeMessages[id]) {
                        caption = parsePlaceholders(data.welcomeMessages[id]);
                    } else {
                        caption = `─── ❖ WELCOME ❖ ───\n\n` +
                                  `  • ᴜsᴇʀ    : @${username}\n` +
                                  `  • ɢʀᴏᴜᴘ   : ${groupName}\n` +
                                  `  • ᴍᴇᴍʙᴇʀ  : #${memberCount}\n` +
                                  `  • ᴛɪᴍᴇ    : ${timeStr}\n\n` +
                                  `  ${timeGreeting.toLowerCase()}. check the description\n` +
                                  `  and keep the chat active.\n\n` +
                                  `───────────────────`;
                    }
                }

                // ── GOODBYE HANDLER ──
                if (action === 'remove' && data.goodbyeEnabled.includes(id)) {
                    if (data.goodbyeMessages[id]) {
                        caption = parsePlaceholders(data.goodbyeMessages[id]);
                    } else {
                        caption = `─── ❖ GOODBYE ❖ ───\n\n` +
                                  `  • ᴜsᴇʀ    : @${username}\n` +
                                  `  • ɢʀᴏᴜᴘ   : ${groupName}\n` +
                                  `  • ᴍᴇᴍʙᴇʀs : ${memberCount} left\n` +
                                  `  • ᴛɪᴍᴇ    : ${timeStr}\n\n` +
                                  `  farewell. you will be missed.\n\n` +
                                  `───────────────────`;
                    }
                }

                if (caption) {
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
// 2. COMMAND HANDLER (.welcome & .goodbye)
// ─────────────────────────────────────────
module.exports = {
    name: 'greeting',
    alias: ['welcome', 'setwelcome', 'goodbye', 'setgoodbye'],
    category: 'group',
    description: 'Toggle and configure welcome & goodbye messages',
    
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
        const subCmd = (args[0] || "").toLowerCase();

        const placeholderHelp = `*Available Placeholders:*\n` +
                                `• *@user* : Mentions the user\n` +
                                `• *@uname* : User's number (no tag)\n` +
                                `• *@group* : Group title\n` +
                                `• *@count* : Total members\n` +
                                `• *@desc* : Group description\n` +
                                `• *@time* : Current time\n` +
                                `• *@date* : Current date\n` +
                                `• *@day* : Current day (e.g., Monday)\n` +
                                `• *@greeting* : Morning/Afternoon/Evening\n` +
                                `• *@owner* : Tags group creator\n` +
                                `• *@bot* : Active bot name`;

        // --- SET WELCOME SHORTCUT ---
        if (commandUsed === 'setwelcome') {
            const customMsg = args.join(" ").trim();
            if (!customMsg) return await sock.sendMessage(jid, { text: `⚠️ *Please provide a custom message!*\n\n${placeholderHelp}` }, { quoted: msg });
            data.welcomeMessages[jid] = customMsg;
            if (!data.welcomeEnabled.includes(jid)) data.welcomeEnabled.push(jid);
            saveGreetingData(data);
            return await sock.sendMessage(jid, { text: "✅ *Custom welcome message configured and enabled!*" }, { quoted: msg });
        }

        // --- SET GOODBYE SHORTCUT ---
        if (commandUsed === 'setgoodbye') {
            const customMsg = args.join(" ").trim();
            if (!customMsg) return await sock.sendMessage(jid, { text: `⚠️ *Please provide a custom message!*\n\n${placeholderHelp}` }, { quoted: msg });
            data.goodbyeMessages[jid] = customMsg;
            if (!data.goodbyeEnabled.includes(jid)) data.goodbyeEnabled.push(jid);
            saveGreetingData(data);
            return await sock.sendMessage(jid, { text: "✅ *Custom goodbye message configured and enabled!*" }, { quoted: msg });
        }

        // --- WELCOME COMMANDS ---
        if (commandUsed === 'welcome') {
            if (subCmd === "on") {
                if (!data.welcomeEnabled.includes(jid)) data.welcomeEnabled.push(jid);
                saveGreetingData(data);
                return await sock.sendMessage(jid, { text: "✅ *Welcome message enabled!*" }, { quoted: msg });
            }
            if (subCmd === "off") {
                data.welcomeEnabled = data.welcomeEnabled.filter(id => id !== jid);
                saveGreetingData(data);
                return await sock.sendMessage(jid, { text: "🚫 *Welcome message disabled!*" }, { quoted: msg });
            }
            if (subCmd === "set") {
                const customMsg = args.slice(1).join(" ").trim();
                if (!customMsg) return await sock.sendMessage(jid, { text: `⚠️ *Usage:* .welcome set <message>` }, { quoted: msg });
                data.welcomeMessages[jid] = customMsg;
                if (!data.welcomeEnabled.includes(jid)) data.welcomeEnabled.push(jid);
                saveGreetingData(data);
                return await sock.sendMessage(jid, { text: "✅ *Custom welcome message saved!*" }, { quoted: msg });
            }
            if (subCmd === "reset") {
                delete data.welcomeMessages[jid];
                saveGreetingData(data);
                return await sock.sendMessage(jid, { text: "✅ *Welcome message reset to default!*" }, { quoted: msg });
            }
            return await sock.sendMessage(jid, { text: `⚙️ *WELCOME MENU*\n\n• .welcome on\n• .welcome off\n• .welcome set <text>\n• .setwelcome <text>\n• .welcome reset\n\n${placeholderHelp}` }, { quoted: msg });
        }

        // --- GOODBYE COMMANDS ---
        if (commandUsed === 'goodbye') {
            if (subCmd === "on") {
                if (!data.goodbyeEnabled.includes(jid)) data.goodbyeEnabled.push(jid);
                saveGreetingData(data);
                return await sock.sendMessage(jid, { text: "✅ *Goodbye message enabled!*" }, { quoted: msg });
            }
            if (subCmd === "off") {
                data.goodbyeEnabled = data.goodbyeEnabled.filter(id => id !== jid);
                saveGreetingData(data);
                return await sock.sendMessage(jid, { text: "🚫 *Goodbye message disabled!*" }, { quoted: msg });
            }
            if (subCmd === "set") {
                const customMsg = args.slice(1).join(" ").trim();
                if (!customMsg) return await sock.sendMessage(jid, { text: `⚠️ *Usage:* .goodbye set <message>` }, { quoted: msg });
                data.goodbyeMessages[jid] = customMsg;
                if (!data.goodbyeEnabled.includes(jid)) data.goodbyeEnabled.push(jid);
                saveGreetingData(data);
                return await sock.sendMessage(jid, { text: "✅ *Custom goodbye message saved!*" }, { quoted: msg });
            }
            if (subCmd === "reset") {
                delete data.goodbyeMessages[jid];
                saveGreetingData(data);
                return await sock.sendMessage(jid, { text: "✅ *Goodbye message reset to default!*" }, { quoted: msg });
            }
            return await sock.sendMessage(jid, { text: `⚙️ *GOODBYE MENU*\n\n• .goodbye on\n• .goodbye off\n• .goodbye set <text>\n• .setgoodbye <text>\n• .goodbye reset\n\n${placeholderHelp}` }, { quoted: msg });
        }
    }
};
