// plugins/warn.js – KIRA X MD (Advanced Warning System)

// Safe initialization of global variables
global.warnData = global.warnData || {};
global.warnLimit = global.warnLimit || 3; // Default limit 3

module.exports = [
{
    name: "warn",
    category: "group",
    description: "Warn a group member",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith("@g.us")) {
            return await sock.sendMessage(jid, { text: "❌ *This command can only be used in groups!*" }, { quoted: msg });
        }

        // ─── Admin Check ───
        const senderRaw = msg.key.participant || msg.key.remoteJid || "";
        const sender = senderRaw.split('@')[0].split(':')[0] + '@s.whatsapp.net';
        const botNumber = (sock.user?.id || "").split('@')[0].split(':')[0] + '@s.whatsapp.net';

        const groupMetadata = await sock.groupMetadata(jid);
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
        }

        // ─── Target Extraction (Mention or Reply) ───
        const context = msg.message?.extendedTextMessage?.contextInfo || {};
        const quotedJid = context.participant;
        const mentionedJid = context.mentionedJid;
        let target = mentionedJid && mentionedJid.length > 0 ? mentionedJid[0] : (quotedJid || null);

        if (!target) {
            return await sock.sendMessage(jid, { text: "❌ *Please mention or reply to a user to warn!*" }, { quoted: msg });
        }

        // Prevent warning the bot or self
        if (target === botNumber) {
            return await sock.sendMessage(jid, { text: "❌ *I cannot warn myself!*" }, { quoted: msg });
        }

        const reason = args.slice(mentionedJid?.length > 0 ? 1 : 0).join(" ") || "No Reason";

        if (!global.warnData[jid]) global.warnData[jid] = {};
        if (!global.warnData[jid][target]) global.warnData[jid][target] = [];

        global.warnData[jid][target].push(reason);
        const count = global.warnData[jid][target].length;

        await sock.sendMessage(jid, {
            text: `⚠️ *WARNING*\n\n👤 User: @${target.split("@")[0]}\n📊 Warns: ${count}/${global.warnLimit}\n\n📝 Reason:\n${reason}`,
            mentions: [target]
        }, { quoted: msg });

        // Kick if limit reached
        if (count >= global.warnLimit) {
            try {
                const isBotAdmin = groupMetadata.participants.some(p => p.id === botNumber && (p.admin === 'admin' || p.admin === 'superadmin'));
                if (isBotAdmin) {
                    await sock.groupParticipantsUpdate(jid, [target], "remove");
                    await sock.sendMessage(jid, { text: `🚫 *@${target.split("@")[0]} has been removed from the group because they reached the warning limit (${global.warnLimit}).*`, mentions: [target] });
                } else {
                    await sock.sendMessage(jid, { text: `⚠️ *User reached warning limit, but I need to be an admin to kick them!*` });
                }
            } catch (e) {
                console.error("Warn kick error:", e);
            }
            delete global.warnData[jid][target];
        }
    }
},

{
    name: "warnings",
    alias: ["warns"],
    category: "group",
    description: "Check warnings of a user",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith("@g.us")) return;

        const context = msg.message?.extendedTextMessage?.contextInfo || {};
        let target = context.mentionedJid?.[0] || context.participant;

        if (!target) {
            target = msg.key.participant || msg.key.remoteJid; // Check self if no one tagged
        }

        const warns = global.warnData?.[jid]?.[target] || [];

        await sock.sendMessage(jid, {
            text: `👤 *Warnings for @${target.split("@")[0]}*\n\n⚠️ *Total Warns:* ${warns.length}/${global.warnLimit}\n\n${warns.map((x, i) => `${i + 1}.${x}`).join("\n") || "_No warnings_"}`,
            mentions: [target]
        }, { quoted: msg });
    }
},

{
    name: "rmwarn",
    alias: ["rnwarn", "removewarn"],
    category: "group",
    description: "Remove a warning from a user",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith("@g.us")) return;

        const senderRaw = msg.key.participant || msg.key.remoteJid || "";
        const sender = senderRaw.split('@')[0].split(':')[0] + '@s.whatsapp.net';
        const groupMetadata = await sock.groupMetadata(jid);
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
        }

        const context = msg.message?.extendedTextMessage?.contextInfo || {};
        let target = context.mentionedJid?.[0] || context.participant;

        if (!target) {
            return await sock.sendMessage(jid, { text: "❌ *Please tag or reply to a user to remove their warning!*" }, { quoted: msg });
        }

        if (global.warnData?.[jid]?.[target]?.length > 0) {
            global.warnData[jid][target].pop();
            await sock.sendMessage(jid, { 
                text: `✅ *One warning removed for @${target.split("@")[0]}*`,
                mentions: [target]
            }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, { text: "⚠️ *This user has no warnings to remove!*" }, { quoted: msg });
        }
    }
},

{
    name: "resetwarn",
    category: "group",
    description: "Reset all warnings of a user",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith("@g.us")) return;

        const senderRaw = msg.key.participant || msg.key.remoteJid || "";
        const sender = senderRaw.split('@')[0].split(':')[0] + '@s.whatsapp.net';
        const groupMetadata = await sock.groupMetadata(jid);
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
        }

        const context = msg.message?.extendedTextMessage?.contextInfo || {};
        let target = context.mentionedJid?.[0] || context.participant;

        if (!target) {
            return await sock.sendMessage(jid, { text: "❌ *Please tag a user to reset warnings!*" }, { quoted: msg });
        }

        if (global.warnData?.[jid]) {
            delete global.warnData[jid][target];
        }

        await sock.sendMessage(jid, {
            text: `✅ *All warnings reset for @${target.split("@")[0]}*`,
            mentions: [target]
        }, { quoted: msg });
    }
},

{
    name: "setwarnlimit",
    category: "group",
    description: "Set the max warnings before kick",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith("@g.us")) return;

        const senderRaw = msg.key.participant || msg.key.remoteJid || "";
        const sender = senderRaw.split('@')[0].split(':')[0] + '@s.whatsapp.net';
        const groupMetadata = await sock.groupMetadata(jid);
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Group Admins only!*" }, { quoted: msg });
        }

        const num = parseInt(args[0]);
        if (!num || isNaN(num)) {
            return await sock.sendMessage(jid, { text: `❌ *Please provide a valid number!*\n_Example: .setwarnlimit 3_` }, { quoted: msg });
        }

        global.warnLimit = num;

        await sock.sendMessage(jid, {
            text: `✅ *Warn limit set to ${num}*`
        }, { quoted: msg });
    }
}
];