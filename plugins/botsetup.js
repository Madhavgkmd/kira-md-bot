const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

// ഡാറ്റാബേസ് ഫംഗ്ഷൻ്റെ പേര് ഏതായാലും സുരക്ഷിതമായി അപ്ഡേറ്റ് ചെയ്യുന്ന ഹെൽപ്പർ
function saveSettings(botNumber, dataObj) {
    if (typeof db.updateSettings === 'function') {
        db.updateSettings(botNumber, dataObj);
    } else if (typeof db.updateSetting === 'function') {
        for (const [key, value] of Object.entries(dataObj)) {
            db.updateSetting(botNumber, key, value);
        }
    }
}

// ─────────────────────────────────────
// HELPER: UPDATE .ENV FILE PERMANENTLY
// ─────────────────────────────────────
function updateEnv(key, value) {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) fs.writeFileSync(envPath, '');
    let envData = fs.readFileSync(envPath, 'utf8');
    const regex = new RegExp(`^${key}=.*`, 'm');
    
    if (regex.test(envData)) {
        envData = envData.replace(regex, `${key}="${value}"`);
    } else {
        envData += `\n${key}="${value}"`;
    }
    fs.writeFileSync(envPath, envData);
    process.env[key] = value;
}

// കമാൻഡ് പ്രവർത്തിപ്പിക്കുന്നത് മെയിൻ ബോട്ട് ആണോ എന്ന് പരിശോധിക്കാൻ
function isMainBot(sock) {
    const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "");
    const mainNumber = (process.env.BOT_NUMBER || "").replace(/[^0-9]/g, "");
    return botNumber === mainNumber;
}

module.exports = [
    // 1. SET BOT NAME
    {
        name: 'botname',
        alias: ['setbotname', 'namebot'],
        category: 'owner',
        description: 'Change Bot Name',
        usage: '.botname <New Name>',
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner Only Command!' }, { quoted: msg });
            
            const newName = args.join(" ").trim();
            if (!newName) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Example: .botname SashaBot' }, { quoted: msg });
            
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "");
            saveSettings(botNumber, { botName: newName });
            
            if (isMainBot(sock)) updateEnv('BOT_NAME', newName);
            
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Bot Name updated to: *${newName}*` }, { quoted: msg });
        }
    },
    // 2. SET OWNER NAME
    {
        name: 'setowner',
        alias: ['ownername'],
        category: 'owner',
        description: 'Change Owner Name',
        usage: '.setowner <New Name>',
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner Only Command!' }, { quoted: msg });
            
            const newOwner = args.join(" ").trim();
            if (!newOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Example: .setowner Rahul' }, { quoted: msg });
            
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "");
            saveSettings(botNumber, { ownerName: newOwner });
            
            if (isMainBot(sock)) updateEnv('OWNER_NAME', newOwner);
            
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Owner Name updated to: *${newOwner}*` }, { quoted: msg });
        }
    },
    // 3. SET PREFIX
    {
        name: 'prefix',
        alias: ['setprefix'],
        category: 'owner',
        description: 'Change Command Prefix',
        usage: '.prefix <New Prefix>',
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner Only Command!' }, { quoted: msg });
            
            const newPrefix = args[0];
            if (!newPrefix || newPrefix.length > 2) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Please provide a valid single character prefix.\nExample: .prefix !' }, { quoted: msg });
            
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "");
            saveSettings(botNumber, { prefix: newPrefix });
            
            if (isMainBot(sock)) updateEnv('PREFIX', newPrefix);
            
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Prefix successfully changed to: *${newPrefix}*` }, { quoted: msg });
        }
    },
    // 4. SET MENU PHOTO
    {
        name: 'setphoto',
        alias: ['menuimage', 'setmenuimage'],
        category: 'owner',
        description: 'Change Menu Image URL',
        usage: '.setphoto <URL>',
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner Only Command!' }, { quoted: msg });
            
            const url = args[0];
            if (!url || !url.startsWith('http')) return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Please provide a valid direct image URL.\nExample: .setphoto https://i.imgur.com/image.jpg' }, { quoted: msg });
            
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "");
            saveSettings(botNumber, { menuImage: url });
            
            if (isMainBot(sock)) updateEnv('MENU_IMAGE', url);
            
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Menu Image updated successfully!\nURL: ${url}` }, { quoted: msg });
        }
    },
    // 5. SET STICKER PACK & WATERMARK (PRESERVES EXACT FORMATTING)
    {
        name: 'setpack',
        alias: ['packname', 'author'],
        category: 'owner',
        description: 'Change Sticker Pack Name and formatting exactly as typed',
        usage: '.packname <Text with spaces and enters>',
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner Only Command!' }, { quoted: msg });
            
            // ഒറിജിനൽ മെസ്സേജിലെ വരികളും സ്പേസുകളും അതുപോലെ വേർതിരിച്ചെടുക്കുന്നു
            const rawText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            const firstWs = rawText.search(/\s/);
            const customText = firstWs !== -1 ? rawText.substring(firstWs + 1) : "";

            if (!customText.trim()) {
                return await sock.sendMessage(msg.key.remoteJid, { 
                    text: '⚠️ Please provide text!\nExample:\n.packname\n✦ ᴹᵃᵈʰᵃᵛ ✦\n​​₉₁₈₈₂₅₂₃₀₈' 
                }, { quoted: msg });
            }
            
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "");
            
            // ടൈപ്പ് ചെയ്ത വാട്ടർമാർക്ക് മുഴുവനായി പാക്ക് നെയിമിലേക്ക് നൽകുന്നു
            saveSettings(botNumber, { packName: customText, authorName: "" });
            
            if (isMainBot(sock)) {
                updateEnv('PACK_NAME', customText.replace(/\n/g, '\\n'));
                updateEnv('AUTHOR_NAME', '');
            }
            
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `✅ *Sticker Watermark Updated!*\n\n${customText}` 
            }, { quoted: msg });
        }
    },
    // 6. RESET TO DEFAULT CONFIG
    {
        name: 'resetconfig',
        alias: ['default', 'resetsettings'],
        category: 'owner',
        description: 'Reset Bot Name and Settings to Default',
        usage: '.resetconfig',
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner Only Command!' }, { quoted: msg });
            
            const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "");
            saveSettings(botNumber, {
                botName: "KIRA X MD",
                ownerName: "Madhav",
                menuImage: "https://files.catbox.moe/22x0j5.jpeg",
                packName: "KIRA X MD • Stickers",
                authorName: "User"
            });
            
            if (isMainBot(sock)) {
                const envPath = path.join(process.cwd(), '.env');
                if (fs.existsSync(envPath)) {
                    let envData = fs.readFileSync(envPath, 'utf8');
                    envData = envData.replace(/^BOT_NAME=.*/m, 'BOT_NAME="KIRA X MD"');
                    envData = envData.replace(/^OWNER_NAME=.*/m, 'OWNER_NAME="Madhav"');
                    envData = envData.replace(/^MENU_IMAGE=.*/m, 'MENU_IMAGE="https://files.catbox.moe/22x0j5.jpeg"');
                    envData = envData.replace(/^PACK_NAME=.*/m, 'PACK_NAME="KIRA X MD • Stickers"');
                    envData = envData.replace(/^AUTHOR_NAME=.*/m, 'AUTHOR_NAME="User"');
                    fs.writeFileSync(envPath, envData);
                }
                process.env.BOT_NAME = "KIRA X MD";
                process.env.OWNER_NAME = "Madhav";
                process.env.MENU_IMAGE = "https://files.catbox.moe/22x0j5.jpeg";
                process.env.PACK_NAME = "KIRA X MD • Stickers";
                process.env.AUTHOR_NAME = "User";
            }
            
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ All bot settings successfully reset to default (KIRA X MD)!` }, { quoted: msg });
        }
    }
];

