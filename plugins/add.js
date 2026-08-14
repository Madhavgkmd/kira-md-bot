// plugins/add.js – KIRA X MD (Smart Add User with Invite Fallback)
module.exports = {
    name: 'add',
    alias: ['addmember'],
    category: 'group',
    description: 'Add a user to the group (mention, reply, or number)',
    usage: `${process.env.PREFIX || '.'}add <@mention | reply | phone number>`,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith('@g.us')) {
            return await sock.sendMessage(jid, { text: "❌ *This command can only be used in groups!*" }, { quoted: msg });
        }

        // ─── Admin Check ───
        const sender = msg.key.participant || msg.key.remoteJid;
        const groupMetadata = await sock.groupMetadata(jid);
        const isAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isAdmin && !isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
        }

        // ─── Get Target ───
        let target = null;

        // 1. Check if user mentioned someone
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentioned && mentioned.length > 0) {
            target = mentioned[0];
        }

        // 2. Check if replying to a message
        if (!target) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
                if (quotedSender) target = quotedSender;
                else if (quoted.key?.participant) target = quoted.key.participant;
                else if (quoted.key?.remoteJid) target = quoted.key.remoteJid;
            }
        }

        // 3. Check if phone number provided in args
        if (!target && args && args.length > 0) {
            const phone = args[0].replace(/[^0-9]/g, '');
            if (phone.length >= 10) {
                target = phone + '@s.whatsapp.net';
            }
        }

        if (!target) {
            return await sock.sendMessage(jid, {
                text: `❌ *No user found*\n\n➤ ${process.env.PREFIX || '.'}add @user (mention)\n➤ ${process.env.PREFIX || '.'}add (reply to user's message)\n➤ ${process.env.PREFIX || '.'}add 919876543210`
            }, { quoted: msg });
        }

        // ─── Prevent adding self ───
        if (target === sender) {
            return await sock.sendMessage(jid, { text: "❌ *You cannot add yourself!*" }, { quoted: msg });
        }

        // ─── Try to add ───
        try {
            const res = await sock.groupParticipantsUpdate(jid, [target], "add");
            
            // 🔥 Baileys Error Check (ചിലപ്പോൾ Error Throw ചെയ്യുന്നതിന് പകരം Array ആയിട്ട് 403/463 തരും)
            let isRestricted = false;
            if (Array.isArray(res) && res[0]) {
                if (res[0].status == 403 || res[0].status == 463 || res[0].status == 409) {
                    isRestricted = true;
                }
            }

            if (isRestricted) {
                throw { data: 463, message: "account_reachout_restricted" }; // Catch ബ്ലോക്കിലേക്ക് വിടുന്നു
            }

            await sock.sendMessage(jid, {
                text: `✅ *User added successfully!*\n📌 @${target.split('@')[0]}`,
                mentions: [target]
            }, { quoted: msg });

        } catch (err) {
            console.error("Add error:", err);
            const errString = String(err.message || err);
            const errData = err.data || err.output?.statusCode;
            
            // 🔥 പ്രൈവസി കാരണം ആഡ് ചെയ്യാൻ പറ്റിയില്ലെങ്കിൽ ലിങ്ക് അയക്കുന്നു!
            if (errData === 463 || errData === 403 || errData === 409 || errString.includes("restricted") || errString.includes("463")) {
                try {
                    const code = await sock.groupInviteCode(jid);
                    const link = `https://chat.whatsapp.com/${code}`;
                    const groupName = groupMetadata.subject;

                    // DM-ലേക്ക് ലിങ്ക് അയക്കുന്നു
                    await sock.sendMessage(target, {
                        text: `👋 *Hello!*\n\nYou were invited to join the group *${groupName}*.\n\nSince your privacy settings prevent me from adding you directly, please use this link to join:\n${link}`
                    });

                    // ഗ്രൂപ്പിൽ ഇൻഫോം ചെയ്യുന്നു
                    await sock.sendMessage(jid, {
                        text: `⚠️ *Privacy Restricted!*\n\nI couldn't add @${target.split('@')[0]} directly due to their privacy settings.\n\n✅ _An invite link has been automatically sent to their DM!_`,
                        mentions: [target]
                    }, { quoted: msg });

                } catch (inviteErr) {
                    await sock.sendMessage(jid, {
                        text: `❌ *Failed to add user!*\nThey have restricted group adds, and I don't have permission to generate an invite link.`
                    }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(jid, {
                    text: `❌ *Failed to add user*\n➤ Make sure I am an admin and the number is valid.`
                }, { quoted: msg });
            }
        }
    }
};