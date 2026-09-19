module.exports = {
    name: 'clear',
    alias: ['clearchat'],
    category: 'group',
    description: 'Clear chats for groups, DMs, or current chat',
    usage: '.clear | .clearchat <dms/grp/all>',

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        // ഓണർക്ക് (നിനക്ക്) മാത്രമേ ഇത് ഉപയോഗിക്കാൻ സാധിക്കൂ
        if (!isOwner) {
            return await sock.sendMessage(
                jid, 
                { text: "❌ *Owner only command!*" }, 
                { quoted: msg }
            );
        }

        const type = args[0]?.toLowerCase();

        try {
            // 1. '.clear' എന്ന് മാത്രം അടിച്ചാൽ ആ ഗ്രൂപ്പിലെ/ചാറ്റിലെ മെസ്സേജ് ക്ലിയർ ചെയ്യും
            if (!type) {
                await sock.chatModify({ delete: true }, jid);
                await sock.sendMessage(jid, { text: "✅ *Chat cleared successfully!*" });
                return;
            }

            // 2. '.clearchat grp' - എല്ലാ ഗ്രൂപ്പ് ചാറ്റുകളും ക്ലിയർ ചെയ്യാൻ
            if (type === 'grp') {
                await sock.sendMessage(jid, { text: "⏳ *Clearing all group chats...*" }, { quoted: msg });
                
                // ബോട്ട് ഉള്ള എല്ലാ ഗ്രൂപ്പുകളും കണ്ടുപിടിക്കുന്നു
                const groups = await sock.groupFetchAllParticipating();
                let count = 0;
                
                for (const groupJid in groups) {
                    try { 
                        await sock.chatModify({ delete: true }, groupJid); 
                        count++;
                        // അക്കൗണ്ട് ബാൻ ആവാതിരിക്കാൻ ഓരോ ഗ്രൂപ്പ് ക്ലിയർ ചെയ്യുമ്പോഴും ഒരു ചെറിയ ഗ്യാപ്പ് (1 second)
                        await new Promise(r => setTimeout(r, 1000)); 
                    } catch (e) { 
                        console.error(`Failed to clear ${groupJid}`, e);
                    }
                }
                return await sock.sendMessage(jid, { text: `✅ *Successfully cleared ${count} group chats!*` }, { quoted: msg });
            }

            // 3. '.clearchat dms' - DM ചാറ്റുകൾ ക്ലിയർ ചെയ്യാൻ
            if (type === 'dms') {
                await sock.sendMessage(jid, { text: "⏳ *Clearing active DMs...*\n_(Note: It will clear the DMs currently active in bot's memory)_" }, { quoted: msg });
                
                // ബോട്ട് സ്റ്റാർട്ട് ആയ ശേഷം വന്ന DM മെസ്സേജുകളുടെ JID കണ്ടുപിടിക്കുന്നു
                const dms = [...new Set(Object.values(global.messageStore)
                    .map(m => m.key.remoteJid)
                    .filter(id => id && id.endsWith('@s.whatsapp.net')))
                ];
                
                let count = 0;
                for (const dmJid of dms) {
                    try { 
                        await sock.chatModify({ delete: true }, dmJid); 
                        count++;
                        await new Promise(r => setTimeout(r, 1000));
                    } catch (e) {}
                }
                return await sock.sendMessage(jid, { text: `✅ *Cleared ${count} active DMs!*` }, { quoted: msg });
            }

            // 4. '.clearchat all' - ഗ്രൂപ്പും DM ഉം എല്ലാം ഒരുമിച്ച് ക്ലിയർ ചെയ്യാൻ
            if (type === 'all') {
                await sock.sendMessage(jid, { text: "⏳ *Clearing all active chats (Groups & DMs)...*" }, { quoted: msg });
                
                // ആദ്യം ഗ്രൂപ്പുകൾ
                const groups = await sock.groupFetchAllParticipating();
                let grpCount = 0;
                for (const groupJid in groups) {
                    try { await sock.chatModify({ delete: true }, groupJid); grpCount++; await new Promise(r => setTimeout(r, 500)); } catch (e) {}
                }

                // പിന്നെ DMs
                const dms = [...new Set(Object.values(global.messageStore).map(m => m.key.remoteJid).filter(id => id && id.endsWith('@s.whatsapp.net')))];
                let dmCount = 0;
                for (const dmJid of dms) {
                    try { await sock.chatModify({ delete: true }, dmJid); dmCount++; await new Promise(r => setTimeout(r, 500)); } catch (e) {}
                }
                
                return await sock.sendMessage(jid, { text: `✅ *Success!*\n➢ Cleared ${grpCount} Groups\n➢ Cleared ${dmCount} DMs` }, { quoted: msg });
            }

            // അക്ഷരത്തെറ്റ് വന്നാൽ യൂസറിന് ശരിയായ ഫോർമാറ്റ് കാണിച്ചുകൊടുക്കുന്നു
            return await sock.sendMessage(jid, { 
                text: "⚠️ *Usage:*\n➢ `.clear` (Clear current chat)\n➢ `.clearchat grp` (Clear all groups)\n➢ `.clearchat dms` (Clear DMs)\n➢ `.clearchat all` (Clear both)" 
            }, { quoted: msg });

        } catch (error) {
            console.error('Clear Chat Error:', error);
            await sock.sendMessage(jid, { text: `❌ *Failed to clear chat:* ${error.message}` }, { quoted: msg });
        }
    }
};