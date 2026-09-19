module.exports = [
    {
        name: 'kick',
        category: 'group',
        description: 'Remove a member from the group',
        
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            if (!jid.endsWith('@g.us')) return await sock.sendMessage(jid, { text: "❌ *This command can only be used in groups!*" }, { quoted: msg });

            // 🚨 ID Normalization & Admin Check
            const senderRaw = msg.key.participant || msg.key.remoteJid;
            const sender = senderRaw.split(':')[0] + '@s.whatsapp.net';
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

            const groupMetadata = await sock.groupMetadata(jid);
            const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
            const isBotAdmin = groupMetadata.participants.some(p => p.id === botNumber && (p.admin === 'admin' || p.admin === 'superadmin'));

            if (!isSenderAdmin && !isOwner) {
                return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
            }

            if (!isBotAdmin) {
                return await sock.sendMessage(jid, { text: "❌ *Make sure the bot is an admin first!*" }, { quoted: msg });
            }

            const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            let target = quotedJid || (mentionedJid && mentionedJid.length > 0 ? mentionedJid[0] : null);

            if (!target && args.length > 0) target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';

            if (!target) return await sock.sendMessage(jid, { text: "❌ *Reply to or mention the user to kick!*" }, { quoted: msg });

            try {
                await sock.groupParticipantsUpdate(jid, [target], "remove");
                await sock.sendMessage(jid, { text: `✅ *@${target.split('@')[0]} has been kicked!*`, mentions: [target] }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(jid, { text: "❌ *Failed! Cannot remove this user.*" }, { quoted: msg });
            }
        }
    },

    {
        name: 'kickall',
        category: 'group',
        description: 'Remove all members from the group',
        
        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            if (!jid.endsWith('@g.us')) return await sock.sendMessage(jid, { text: "❌ *This command can only be used in groups!*" }, { quoted: msg });

            // 🚨 ID Normalization & Admin Check
            const senderRaw = msg.key.participant || msg.key.remoteJid;
            const sender = senderRaw.split(':')[0] + '@s.whatsapp.net';
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

            const groupMetadata = await sock.groupMetadata(jid);
            const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
            const isBotAdmin = groupMetadata.participants.some(p => p.id === botNumber && (p.admin === 'admin' || p.admin === 'superadmin'));

            if (!isSenderAdmin && !isOwner) {
                return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
            }

            if (!isBotAdmin) {
                return await sock.sendMessage(jid, { text: "❌ *Make sure the bot is an admin first!*" }, { quoted: msg });
            }

            // മറ്റ് അഡ്മിൻമാരെയും ബോട്ടിനെയും ഒഴിവാക്കി സാധാരണ മെമ്പേഴ്സിനെ മാത്രം സെലക്ട് ചെയ്യുന്നു
            const targetMembers = groupMetadata.participants
                .filter(p => p.id !== botNumber && p.id !== sender && p.admin !== 'admin' && p.admin !== 'superadmin')
                .map(p => p.id);

            if (targetMembers.length === 0) {
                return await sock.sendMessage(jid, { text: "⚠️ *No non-admin members found to kick!*" }, { quoted: msg });
            }

            await sock.sendMessage(jid, { 
                text: `⚠️ *KICKALL INITIATED!* ⚠️\n\nRemoving ${targetMembers.length} members...\n\n_To stop this process immediately, use .restart or .reboot_` 
            }, { quoted: msg });

            // വാട്സാപ്പ് ബാൻ വരാതിരിക്കാൻ ഓരോ സെക്കൻഡ് ഗ്യാപ്പിൽ റിമൂവ് ചെയ്യുന്നു
            for (const target of targetMembers) {
                try {
                    await sock.groupParticipantsUpdate(jid, [target], "remove");
                    await new Promise(resolve => setTimeout(resolve, 1000)); 
                } catch (e) {
                    console.error("Kickall Error:", e);
                }
            }

            await sock.sendMessage(jid, { text: "✅ *Kickall process completed.*" }, { quoted: msg });
        }
    }
];