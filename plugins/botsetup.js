// plugins/botsetup.js - KIRA X MD (Dynamic Config Manager)
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────
// HELPER: UPDATE .ENV FILE PERMANENTLY
// ─────────────────────────────────────
function updateEnv(key, value) {
    const envPath = path.join(process.cwd(), '.env');
    
    // ഫയൽ ഇല്ലെങ്കിൽ പുതിയത് ഉണ്ടാക്കും
    if (!fs.existsSync(envPath)) fs.writeFileSync(envPath, '');
    
    let envData = fs.readFileSync(envPath, 'utf8');
    const regex = new RegExp(`^${key}=.*`, 'm');
    
    if (regex.test(envData)) {
        // നിലവിൽ ഉണ്ടെങ്കിൽ അത് റീപ്ലേസ് ചെയ്യും
        envData = envData.replace(regex, `${key}="${value}"`);
    } else {
        // ഇല്ലെങ്കിൽ പുതുതായി ആഡ് ചെയ്യും
        envData += `\n${key}="${value}"`;
    }
    
    fs.writeFileSync(envPath, envData);
    
    // ഗ്ലോബൽ കോൺഫിഗും അപ്പൊത്തന്നെ അപ്ഡേറ്റ് ആവാൻ
    if (!global.config) global.config = {};
    global.config[key] = value;
    process.env[key] = value;
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
            
            updateEnv('BOT_NAME', newName);
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
            
            updateEnv('OWNER_NAME', newOwner);
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
            if (!newPrefix || newPrefix.length > 2) {
                return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Please provide a valid single character prefix.\nExample: .prefix !' }, { quoted: msg });
            }
            
            updateEnv('PREFIX', newPrefix);
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
            if (!url || !url.startsWith('http')) {
                return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Please provide a valid direct image URL.\nExample: .setphoto https://i.imgur.com/image.jpg' }, { quoted: msg });
            }
            
            updateEnv('MENU_IMAGE', url);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Menu Image updated successfully!\nURL: ${url}` }, { quoted: msg });
        }
    },

   // 5. RESET TO DEFAULT CONFIG
    {
        name: 'resetconfig',
        alias: ['default', 'resetsettings'],
        category: 'owner',
        description: 'Reset Bot Name and Settings to Default',
        usage: '.resetconfig',
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner Only Command!' }, { quoted: msg });
            
            const envPath = path.join(process.cwd(), '.env');
            if (fs.existsSync(envPath)) {
                let envData = fs.readFileSync(envPath, 'utf8');
                
                // എല്ലാ കോൺഫിഗറേഷനുകളും ഡിഫോൾട്ടിലേക്ക് മാറ്റുന്നു
                envData = envData.replace(/^BOT_NAME=.*/m, 'BOT_NAME="KIRA X MD"');
                envData = envData.replace(/^OWNER_NAME=.*/m, 'OWNER_NAME="Madhav"');
                envData = envData.replace(/^MENU_IMAGE=.*/m, 'MENU_IMAGE="https://files.catbox.moe/22x0j5.jpeg"');
                envData = envData.replace(/^PACK_NAME=.*/m, 'PACK_NAME="KIRA X MD • Stickers"');
                envData = envData.replace(/^AUTHOR_NAME=.*/m, 'AUTHOR_NAME="User"');
                
                fs.writeFileSync(envPath, envData);
            }

            // ഗ്ലോബൽ വേരിയബിളും പ്രോസസ്സ് എൻവയോൺമെന്റും അപ്ഡേറ്റ് ചെയ്യുന്നു
            if (!global.config) global.config = {};
            global.config.BOT_NAME = "KIRA X MD";
            global.config.OWNER_NAME = "Madhav";
            global.config.MENU_IMAGE = "https://files.catbox.moe/22x0j5.jpeg";
            
            process.env.BOT_NAME = "KIRA X MD";
            process.env.OWNER_NAME = "Madhav";
            process.env.MENU_IMAGE = "https://files.catbox.moe/22x0j5.jpeg";
            process.env.PACK_NAME = "KIRA X MD • Stickers";
            process.env.AUTHOR_NAME = "User";
            
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ All bot settings, names, pack names and images successfully reset to default (KIRA X MD)!` }, { quoted: msg });
        }
    }
];