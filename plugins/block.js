module.exports = [
    // ==========================================
    // 1. BLOCK COMMAND
    // ==========================================
    {
        name: "block",
        category: "owner",

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            
            // ഓണർ ആണോ എന്ന് ചെക്ക് ചെയ്യാൻ
            const sender = msg.key.fromMe ? sock.user.id.split(':') + '@s.whatsapp.net' : msg.key.participant || msg.key.remoteJid;
            const ownerNum = global.ownerNumber ? `${global.ownerNumber}@s.whatsapp.net` : null;

            if (!msg.key.fromMe && sender !== ownerNum) {
                return sock.sendMessage(jid, { text: "❌ *This command is restricted to the Owner!*" }, { quoted: msg });
            }

            // ആരെയാണ് ബ്ലോക്ക് ചെയ്യേണ്ടത് എന്ന് കണ്ടുപിടിക്കുന്നു (ടാഗ് ചെയ്തത് അല്ലെങ്കിൽ റിപ്ലൈ ചെയ്തത്)
            let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            
            if (!target) {
                // റിപ്ലൈ ചെയ്ത മെസ്സേജ് ആണെങ്കിൽ അതിൽ നിന്നും നമ്പർ എടുക്കും
                const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.participant;
                if (quotedMsg) target = quotedMsg;
            }

            // ഗ്രൂപ്പിൽ അല്ലാതെ പ്രൈവറ്റ് ചാറ്റിൽ ആണ് കമാൻഡ് അടിച്ചതെങ്കിൽ ആ ചാറ്റ് തന്നെ ടാർഗറ്റ് ആക്കും
            if (!target && !jid.endsWith("@g.us")) {
                target = jid;
            }

            // ടാർഗറ്റ് കിട്ടിയില്ലെങ്കിൽ എറർ മെസ്സേജ്
            if (!target) {
                return sock.sendMessage(jid, { 
                    text: "❌ *Please tag/reply to a user, or use this command in their private chat!*" 
                }, { quoted: msg });
            }

            try {
                // Baileys ലൈബ്രറിയുടെ ബ്ലോക്ക് ചെയ്യാനുള്ള ഫംഗ്ഷൻ
                await sock.updateBlockStatus(target, "block");
                
                await sock.sendMessage(jid, { 
                    text: `✅ *Successfully Blocked @${target.split("@")}*`, 
                    mentions: [target] 
                });
            } catch (error) {
                console.error("Block Error:", error);
                await sock.sendMessage(jid, { text: "❌ *Failed to block the user!*" }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // 2. UNBLOCK COMMAND
    // ==========================================
    {
        name: "unblock",
        category: "owner",

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            
            const sender = msg.key.fromMe ? sock.user.id.split(':') + '@s.whatsapp.net' : msg.key.participant || msg.key.remoteJid;
            const ownerNum = global.ownerNumber ? `${global.ownerNumber}@s.whatsapp.net` : null;

            if (!msg.key.fromMe && sender !== ownerNum) {
                return sock.sendMessage(jid, { text: "❌ *This command is restricted to the Owner!*" }, { quoted: msg });
            }

            let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            
            if (!target) {
                const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.participant;
                if (quotedMsg) target = quotedMsg;
            }

            if (!target && !jid.endsWith("@g.us")) {
                target = jid;
            }

            if (!target) {
                return sock.sendMessage(jid, { 
                    text: "❌ *Please tag/reply to a user, or use this command in their private chat!*" 
                }, { quoted: msg });
            }

            try {
                // അൺബ്ലോക്ക് ചെയ്യാനുള്ള ഫംഗ്ഷൻ
                await sock.updateBlockStatus(target, "unblock");
                
                await sock.sendMessage(jid, { 
                    text: `✅ *Successfully Unblocked @${target.split("@")}*`, 
                    mentions: [target] 
                });
            } catch (error) {
                console.error("Unblock Error:", error);
                await sock.sendMessage(jid, { text: "❌ *Failed to unblock the user!*" }, { quoted: msg });
            }
        }
    }
];