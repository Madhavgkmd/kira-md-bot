// plugins/ban.js - KIRA X MD Ban System
const fs = require('fs');
const path = require('path');

// ബാൻ ചെയ്യപ്പെട്ടവരെ സേവ് ചെയ്യാനുള്ള ഫയൽ
const dbPath = path.join(__dirname, '../banned.json');
let bannedDB = { users: [], groups: [] };

try {
    if (fs.existsSync(dbPath)) {
        bannedDB = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } else {
        fs.writeFileSync(dbPath, JSON.stringify(bannedDB, null, 2));
    }
} catch (err) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], groups: [] }, null, 2));
}

function saveDB() {
    fs.writeFileSync(dbPath, JSON.stringify(bannedDB, null, 2));
}

module.exports = [
    // ==========================================
    // 🚫 BAN COMMAND
    // ==========================================
    {
        name: 'ban',
        category: 'owner',
        description: 'Ban a user, group, or DM from using the bot',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');

            // Owner ചെക്കിംഗ് (ഓണർക്ക് മാത്രമേ ബാൻ ചെയ്യാൻ പറ്റൂ)
            const ownerNumber = process.env.OWNER_NUMBER || ""; 
            const isOwner = msg.key.fromMe || (ownerNumber && sender.includes(ownerNumber));
            
            if (!isOwner) return await sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg });

            // മെൻഷൻ ചെയ്ത യൂസറിനെയോ അല്ലെങ്കിൽ റിപ്ലൈ ചെയ്ത യൂസറിനെയോ കണ്ടുപിടിക്കാൻ
            const mentionedJidList = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const quotedUser = msg.message?.extendedTextMessage?.contextInfo?.participant;
            let targetUser = mentionedJidList.length > 0 ? mentionedJidList[0] : (quotedUser ? quotedUser : null);

            // 1. മെൻഷൻ / റിപ്ലൈ വഴി യൂസറെ ബാൻ ചെയ്യാൻ
            if (targetUser) {
                if (!bannedDB.users.includes(targetUser)) {
                    bannedDB.users.push(targetUser);
                    saveDB();
                    return await sock.sendMessage(jid, { text: `✅ *User Banned!* \n@${targetUser.split('@')[0]} can no longer use the bot.`, mentions: [targetUser] }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: `⚠️ *User is already banned!*` }, { quoted: msg });
                }
            }

            // 2. ഗ്രൂപ്പ് ബാൻ ചെയ്യാൻ (ഗ്രൂപ്പിൽ വെറുതെ .ban അടിച്ചാൽ)
            if (isGroup) {
                if (!bannedDB.groups.includes(jid)) {
                    bannedDB.groups.push(jid);
                    saveDB();
                    return await sock.sendMessage(jid, { text: `✅ *Group Banned!* \nI will ignore all commands in this group from now on.` }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: `⚠️ *This group is already banned!*` }, { quoted: msg });
                }
            }

            // 3. DM ബാൻ ചെയ്യാൻ (DM-ൽ വെറുതെ .ban അടിച്ചാൽ)
            if (!isGroup) {
                if (!bannedDB.users.includes(jid)) {
                    bannedDB.users.push(jid);
                    saveDB();
                    return await sock.sendMessage(jid, { text: `✅ *DM Banned!* \nI will no longer reply to your messages.` }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: `⚠️ *This DM is already banned!*` }, { quoted: msg });
                }
            }
        }
    },

    // ==========================================
    // ♻️ UNBAN COMMAND
    // ==========================================
    {
        name: 'unban',
        category: 'owner',
        description: 'Unban a user, group, or DM',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');

            const ownerNumber = process.env.OWNER_NUMBER || "";
            const isOwner = msg.key.fromMe || (ownerNumber && sender.includes(ownerNumber));
            
            if (!isOwner) return await sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg });

            const mentionedJidList = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const quotedUser = msg.message?.extendedTextMessage?.contextInfo?.participant;
            let targetUser = mentionedJidList.length > 0 ? mentionedJidList[0] : (quotedUser ? quotedUser : null);

            // 1. യൂസറെ അൺബാൻ ചെയ്യാൻ
            if (targetUser) {
                if (bannedDB.users.includes(targetUser)) {
                    bannedDB.users = bannedDB.users.filter(u => u !== targetUser);
                    saveDB();
                    return await sock.sendMessage(jid, { text: `✅ *User Unbanned!* \n@${targetUser.split('@')[0]} can now use the bot.`, mentions: [targetUser] }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: `⚠️ *User is not banned!*` }, { quoted: msg });
                }
            }

            // 2. ഗ്രൂപ്പ് അൺബാൻ ചെയ്യാൻ
            if (isGroup) {
                if (bannedDB.groups.includes(jid)) {
                    bannedDB.groups = bannedDB.groups.filter(g => g !== jid);
                    saveDB();
                    return await sock.sendMessage(jid, { text: `✅ *Group Unbanned!* \nI will now accept commands in this group.` }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: `⚠️ *This group is not banned!*` }, { quoted: msg });
                }
            }

            // 3. DM അൺബാൻ ചെയ്യാൻ
            if (!isGroup) {
                if (bannedDB.users.includes(jid)) {
                    bannedDB.users = bannedDB.users.filter(u => u !== jid);
                    saveDB();
                    return await sock.sendMessage(jid, { text: `✅ *DM Unbanned!*` }, { quoted: msg });
                } else {
                    return await sock.sendMessage(jid, { text: `⚠️ *This DM is not banned!*` }, { quoted: msg });
                }
            }
        }
    }
];