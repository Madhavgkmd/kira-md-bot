const { startSubBot } = require("../lib/subbot");

const MAX_SUBBOTS = 8; // 🔥 Limit set to 8. You can change this number anytime.

module.exports = [
    {
        name: 'pair',
        alias: ['jadibot', 'clone', 'subbot'],
        category: 'utility',
        description: 'Connect your number as a sub-bot',
        usage: '.pair 919876543210',

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;

            // 🔥 CHECKING SUBBOT LIMIT
            const currentSubbots = Object.keys(global.subBots || {}).length;
            if (currentSubbots >= MAX_SUBBOTS) {
                return await sock.sendMessage(jid, { 
                    text: `❌ *server full! maximum limit of ${MAX_SUBBOTS} sub-bots reached on this panel.*` 
                }, { quoted: msg });
            }

            const number = args.join("").replace(/[^0-9]/g, "");

            if (!number) {
                return await sock.sendMessage(jid, { 
                    text: `❌ *please provide a valid whatsapp number!*\n\n_Example: .pair 919876543210_` 
                }, { quoted: msg });
            }

            // Loading reaction
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            // 🔥 കാണിക്കാൻ പറഞ്ഞ സ്റ്റാറ്റസ് മെസ്സേജ് (ഉദാ: Requesting pair code... [ 1/8 ])
            await sock.sendMessage(jid, { 
                text: `🔄 *Requesting pair code... [ ${currentSubbots}/${MAX_SUBBOTS} ]*` 
            }, { quoted: msg });

            try {
                // Triggering the Subbot process
                await startSubBot(number, sock, jid, msg);
            } catch (error) {
                console.error("Pairing Error:", error);
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { 
                    text: "❌ *pairing failed. check panel console for errors.*" 
                }, { quoted: msg });
            }
        }
    },
    {
        name: 'pairstat',
        alias: ['pairlist', 'subbots'],
        category: 'utility',
        description: 'Check active sub-bots on the panel',
        usage: '.pairstat',

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const subBotMap = global.subBots || {};
            const currentSubbotsCount = Object.keys(subBotMap).length;

            let text = `📊 *KIRA X MD - SUBBOT STATUS* 📊\n\n`;
            text += `🔌 *Active Sub-bots:* ${currentSubbotsCount}/${MAX_SUBBOTS}\n\n`;

            if (currentSubbotsCount > 0) {
                text += `*Connected Numbers:*\n`;
                let count = 1;
                // കണക്ട് ആയ എല്ലാ ബോട്ടുകളുടെയും നമ്പർ എടുത്തു ലിസ്റ്റ് ചെയ്യുന്നു
                for (const botNum of Object.keys(subBotMap)) {
                    // അഥവാ നമ്പർ '@s.whatsapp.net' ചേർത്ത് വന്നാൽ അത് ഒഴിവാക്കാൻ
                    const cleanNum = botNum.split('@')[0];
                    text += `${count}. +${cleanNum}\n`;
                    count++;
                }
            } else {
                text += `_No sub-bots are currently connected._\n`;
            }

            await sock.sendMessage(jid, { text: text }, { quoted: msg });
        }
    }
];