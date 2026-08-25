// plugins/prefix.js - KIRA X MD
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'prefix',
    alias: ['setprefix', 'changeprefix'],
    category: 'owner',
    description: 'Change the bot prefix globally for Main and Pair bots',
    usage: '.prefix <new_prefix>',

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        // ഇത് ഓണർക്ക് മാത്രമേ മാറ്റാൻ കഴിയൂ എന്നുള്ള സുരക്ഷ 
        if (!isOwner) {
            return await sock.sendMessage(jid, { text: '❌ *Owner only command!*' }, { quoted: msg });
        }

        const newPrefix = args[0];
        const currentPrefix = process.env.PREFIX || '.';

        if (!newPrefix) {
            return await sock.sendMessage(jid, { text: `⚠️ *Usage:*\n${currentPrefix}prefix !` }, { quoted: msg });
        }

        try {
            // 1. ഉടനടി വർക്ക് ആവാൻ വേണ്ടി നിലവിലെ സിസ്റ്റത്തിൽ മാറ്റുന്നു
            process.env.PREFIX = newPrefix;

            // 2. ബോട്ട് റീസ്റ്റാർട്ട് ആയാലും മാറാൻ വേണ്ടി .env ഫയലിൽ സേവ് ചെയ്യുന്നു
            const envPath = path.join(process.cwd(), '.env');
            
            if (fs.existsSync(envPath)) {
                let envData = fs.readFileSync(envPath, 'utf8');
                
                // ഫയലിൽ PREFIX ഉണ്ടെങ്കിൽ അത് മാറ്റുന്നു, ഇല്ലെങ്കിൽ പുതുതായി ചേർക്കുന്നു
                if (envData.match(/^PREFIX=/m)) {
                    envData = envData.replace(/^PREFIX=.*/m, `PREFIX="${newPrefix}"`);
                } else {
                    envData += `\nPREFIX="${newPrefix}"\n`;
                }
                
                fs.writeFileSync(envPath, envData);
            } else {
                fs.writeFileSync(envPath, `PREFIX="${newPrefix}"\n`);
            }

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            await sock.sendMessage(jid, { text: `✅ *Prefix successfully changed!*\n\n🔄 New Prefix: [  *${newPrefix}*  ]\n_This is applied to the main bot and all pair bots._` }, { quoted: msg });

        } catch (err) {
            console.error("Prefix update error:", err);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: '❌ *Failed to update prefix permanently. But it will work temporarily until the next restart.*' }, { quoted: msg });
        }
    }
};

