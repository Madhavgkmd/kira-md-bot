// plugins/join.js - KIRA X MD (Join group via invite link or code)
module.exports = {
    name: "join",
    alias: ["invite", "joingroup"],
    category: "owner",
    description: "Join a WhatsApp group using invite link or code",
    usage: `${process.env.PREFIX || '.'}join <invite link or code>`,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || jid;

        // 🔍 LOGGING
        console.log("🔹 JOIN command triggered");
        console.log("🔹 Sender:", sender);
        console.log("🔹 isOwner flag:", isOwner);
        console.log("🔹 Args:", args);

        // Owner check using isOwner flag
        if (!isOwner) {
            console.log("❌ Not owner, rejecting");
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return;
        }

        console.log("✅ Owner confirmed, processing...");

        // Get the input: either from args or from quoted message
        let input = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        // If no input, try to get from quoted message
        if (!input) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                const quotedText = quoted.conversation || quoted.extendedTextMessage?.text || '';
                input = quotedText.trim();
                console.log("📎 Got input from quoted message:", input);
            }
        }

        if (!input) {
            await sock.sendMessage(jid, { text: `🔗 *JOIN GROUP*\n\n❌ *Missing invite link or code*\n➤ Example: ${process.env.PREFIX || '.'}join https://chat.whatsapp.com/xxxxx\n➤ Or reply to a message containing the invite link.` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 *Processing invite...*` });

        try {
            // Extract invite code from link
            let inviteCode = input;
            // Check if it's a full link
            if (input.includes('chat.whatsapp.com')) {
                // Extract code from URL (e.g., https://chat.whatsapp.com/xxxxx or https://chat.whatsapp.com/xxxxx? something)
                const match = input.match(/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    inviteCode = match[1];
                } else {
                    throw new Error('Could not extract invite code from link');
                }
            }

            console.log("📩 Invite code extracted:", inviteCode);

            // Join the group
            const result = await sock.groupAcceptInvite(inviteCode);

            await sock.sendMessage(jid, { text: `✅ *Joined group successfully!*\n📋 *Group ID:* ${result}`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Join error:", err);
            let errorMsg = `❌ *Failed to join group*\n➤ ${err.message || 'Invalid invite link or already in group'}`;
            if (err.message && err.message.includes('already')) errorMsg = `❌ *Already in this group*`;
            else if (err.message && err.message.includes('invalid')) errorMsg = `❌ *Invalid or expired invite link*`;
            await sock.sendMessage(jid, { text: errorMsg, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};