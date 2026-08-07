const fs = require('fs');
const path = require('path');

// സ്യൂഡോ നമ്പറുകൾ സേവ് ചെയ്യാനുള്ള ഫയൽ പാത്ത്
const sudoFile = path.join(process.cwd(), 'sudo.json');

// ഫയൽ ഇല്ലെങ്കിൽ പുതിയതായി ഒരെണ്ണം ഉണ്ടാക്കുന്നു
const getSudo = () => {
    if (!fs.existsSync(sudoFile)) fs.writeFileSync(sudoFile, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(sudoFile));
};

module.exports = [
    // ─── 1. ADD SUDO ───
    {
        name: 'addsudo',
        category: 'owner',
        description: 'Add a user to sudo list',
        usage: '.addsudo @user or reply',
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            
            // ഓണർക്ക് മാത്രമേ വേറെ ആളെ സ്യൂഡോ ആക്കാൻ പറ്റൂ
            if (!isOwner) return await sock.sendMessage(jid, { text: '❌ *This command is for the Owner only!*' }, { quoted: msg });

            // റിപ്ലൈ ചെയ്ത മെസ്സേജിൽ നിന്നോ അല്ലെങ്കിൽ മെൻഷൻ ചെയ്തതിൽ നിന്നോ നമ്പർ എടുക്കുന്നു
            let target = msg.message?.extendedTextMessage?.contextInfo?.participant || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
            
            if (!target) return await sock.sendMessage(jid, { text: '❌ *Please reply to a user or mention their number!*\n_Example: .addsudo @user_' }, { quoted: msg });

            let sudoList = getSudo();
            if (sudoList.includes(target)) {
                return await sock.sendMessage(jid, { text: '⚠️ *This user is already a Sudo member!*' }, { quoted: msg });
            }

            sudoList.push(target);
            fs.writeFileSync(sudoFile, JSON.stringify(sudoList, null, 2));

            await sock.sendMessage(jid, { text: `✅ *Successfully added @${target.split('@')[0]} to Sudo List!*\n_They can now use owner commands._`, mentions: [target] }, { quoted: msg });
        }
    },

    // ─── 2. DEL SUDO ───
    {
        name: 'delsudo',
        category: 'owner',
        description: 'Remove a user from sudo list',
        usage: '.delsudo @user or reply',
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            if (!isOwner) return await sock.sendMessage(jid, { text: '❌ *This command is for the Owner only!*' }, { quoted: msg });

            let target = msg.message?.extendedTextMessage?.contextInfo?.participant || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
            
            if (!target) return await sock.sendMessage(jid, { text: '❌ *Please reply to a user or mention their number!*' }, { quoted: msg });

            let sudoList = getSudo();
            if (!sudoList.includes(target)) {
                return await sock.sendMessage(jid, { text: '⚠️ *This user is not in the Sudo list!*' }, { quoted: msg });
            }

            sudoList = sudoList.filter(id => id !== target);
            fs.writeFileSync(sudoFile, JSON.stringify(sudoList, null, 2));

            await sock.sendMessage(jid, { text: `✅ *Successfully removed @${target.split('@')[0]} from Sudo List!*`, mentions: [target] }, { quoted: msg });
        }
    },

    // ─── 3. SUDO LIST ───
    {
        name: 'sudolist',
        category: 'owner',
        description: 'View all sudo members',
        usage: '.sudolist',
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            const sudoList = getSudo();

            if (sudoList.length === 0) {
                return await sock.sendMessage(jid, { text: 'ℹ️ *Sudo list is currently empty.*' }, { quoted: msg });
            }

            let text = `👑 *KIRA X MD SUDO LIST* 👑\n\n`;
            sudoList.forEach((num, index) => {
                text += `${index + 1}. @${num.split('@')[0]}\n`;
            });
            text += `\n> *Total Sudo Users: ${sudoList.length}*`;

            await sock.sendMessage(jid, { text: text, mentions: sudoList }, { quoted: msg });
        }
    }
];