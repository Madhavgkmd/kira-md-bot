// plugins/settings.js
// KIRA X MD - Complete Settings Plugin

const { getSettings, updateSetting } = require("../lib/database");

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getBotNumber(sock) {
    return sock.user?.id
        ?.split(":")[0]
        ?.replace(/[^0-9]/g, "") || "";
}

function getPrefix() {
    return process.env.PREFIX || ".";
}

async function send(sock, msg, text) {
    return sock.sendMessage(
        msg.key.remoteJid,
        { text },
        { quoted: msg }
    );
}

function getState(value) {
    if (!value) return null;

    value = String(value).toLowerCase();

    if (["on", "true", "yes", "enable", "enabled"].includes(value)) {
        return true;
    }

    if (["off", "false", "no", "disable", "disabled"].includes(value)) {
        return false;
    }

    return null;
}

// ─────────────────────────────────────────────
// Toggle Boolean Setting
// ─────────────────────────────────────────────

async function toggleBoolean(sock, msg, args, settingName, isOwner) {

    if (!isOwner) return;

    const jid = msg.key.remoteJid;
    const botNumber = getBotNumber(sock);

    if (!botNumber) {
        return send(sock, msg, "❌ Bot number not available.");
    }

    const action = args?.[0]?.toLowerCase();

    if (!action) {
        const config = getSettings(botNumber);

        const current = config?.[settingName] ? "ON" : "OFF";

        return send(
            sock,
            msg,
            `⚙️ *${settingName.toUpperCase()}*\n\nStatus: *${current}*\n\nUse:\n${getPrefix()}${settingName} on\n${getPrefix()}${settingName} off`
        );
    }

    const state = getState(action);

    if (state === null) {
        return send(
            sock,
            msg,
            `⚠️ Use *on* or *off*.\n\nExample:\n${getPrefix()}${settingName} on`
        );
    }

    updateSetting(botNumber, settingName, state);

    return send(
        sock,
        msg,
        `✅ *${settingName.toUpperCase()}* turned *${state ? "ON" : "OFF"}*.`
    );
}

// ─────────────────────────────────────────────
// Per-Chat Toggle
// ─────────────────────────────────────────────

async function toggleChatSetting(
    sock,
    msg,
    args,
    settingName,
    isOwner
) {

    if (!isOwner) return;

    const jid = msg.key.remoteJid;
    const botNumber = getBotNumber(sock);

    if (!botNumber) {
        return send(sock, msg, "❌ Bot number not available.");
    }

    const action = args?.[0]?.toLowerCase();

    const config = getSettings(botNumber);

    let chats = Array.isArray(config?.[settingName])
        ? [...config[settingName]]
        : [];

    if (!action) {

        const status = chats.includes(jid)
            ? "ON"
            : "OFF";

        return send(
            sock,
            msg,
            `⚙️ *${settingName.toUpperCase()}*\n\nStatus: *${status}*\n\nUse:\n${getPrefix()}${settingName} on\n${getPrefix()}${settingName} off`
        );
    }

    const state = getState(action);

    if (state === null) {
        return send(
            sock,
            msg,
            `⚠️ Use *on* or *off*.\n\nExample:\n${getPrefix()}${settingName} on`
        );
    }

    if (state) {

        if (!chats.includes(jid)) {
            chats.push(jid);
        }

    } else {

        chats = chats.filter(id => id !== jid);
    }

    updateSetting(botNumber, settingName, chats);

    return send(
        sock,
        msg,
        `✅ *${settingName.toUpperCase()}* turned *${state ? "ON" : "OFF"}* for this chat.`
    );
}

// ─────────────────────────────────────────────
// Plugin List
// ─────────────────────────────────────────────

module.exports = [

    // ═══════════════════════════════════════════
    // 1. SETTINGS
    // ═══════════════════════════════════════════

    {
        name: "settings",
        alias: ["set", "config"],
        category: "owner",
        description: "Show bot settings",

        async execute(sock, msg, args, isOwner) {

            if (!isOwner) return;

            const jid = msg.key.remoteJid;
            const botNumber = getBotNumber(sock);

            if (!botNumber) {
                return send(sock, msg, "❌ Bot number not available.");
            }

            const config = getSettings(botNumber);
            const prefix = getPrefix();

            const menu = `⚙️ *KIRA X MD SETTINGS*

01. Mode : ${config.botMode?.toUpperCase() || "PUBLIC"}
02. Bot Online : ${config.botOnline !== false ? "ON" : "OFF"}
03. Auto DL Groups : ${config.autoDlAllGroups ? "ON" : "OFF"}
04. Auto DL DM : ${config.autoDlAllDms ? "ON" : "OFF"}
05. Anti Delete : ${(config.antiDeleteChats || []).includes(jid) ? "ON" : "OFF"}
06. Welcome : ${(config.welcomeChats || []).includes(jid) ? "ON" : "OFF"}
07. Goodbye : ${(config.goodbyeChats || []).includes(jid) ? "ON" : "OFF"}
08. Anti Link : ${(config.antilinkChats || []).includes(jid) ? "ON" : "OFF"}
09. Call Reject : ${config.callReject ? "ON" : "OFF"}
10. Auto Read : ${config.autoRead ? "ON" : "OFF"}
11. Auto React : ${config.autoReact ? "ON" : "OFF"}
12. Auto Reply : ${config.autoReply ? "ON" : "OFF"}
13. Without Handler : ${config.withoutHandler ? "ON" : "OFF"}
14. Auto Status : ${config.autoStatusView ? "ON" : "OFF"}

How to change:

${prefix}mode public
${prefix}mode private

${prefix}botonline on/off
${prefix}autodlgroup on/off
${prefix}autodldm on/off
${prefix}antidelete on/off
${prefix}welcome on/off
${prefix}goodbye on/off
${prefix}antilink on/off
${prefix}callreject on/off
${prefix}autoread on/off
${prefix}autoreact on/off
${prefix}autoreply on/off
${prefix}withouthandler on/off
${prefix}autostatus on/off`;

            await send(sock, msg, menu);
        }
    },

    // ═══════════════════════════════════════════
    // 2. MODE
    // ═══════════════════════════════════════════

    {
        name: "mode",
        alias: ["botmode"],
        category: "owner",
        description: "Change bot mode",

        async execute(sock, msg, args, isOwner) {

            if (!isOwner) return;

            const botNumber = getBotNumber(sock);

            if (!botNumber) {
                return send(sock, msg, "❌ Bot number not available.");
            }

            const mode = args?.[0]?.toLowerCase();

            if (!mode) {
                const config = getSettings(botNumber);

                return send(
                    sock,
                    msg,
                    `⚙️ Current mode: *${config.botMode?.toUpperCase() || "PUBLIC"}*\n\nUse:\n${getPrefix()}mode public\n${getPrefix()}mode private`
                );
            }

            if (mode !== "public" && mode !== "private") {
                return send(
                    sock,
                    msg,
                    "⚠️ Use *public* or *private*."
                );
            }

            updateSetting(botNumber, "botMode", mode);

            return send(
                sock,
                msg,
                `✅ Bot mode changed to *${mode.toUpperCase()}*.`
            );
        }
    },

    // ═══════════════════════════════════════════
    // 3. BOT ONLINE
    // ═══════════════════════════════════════════

    {
        name: "botonline",
        alias: ["online", "btonline"],
        category: "owner",
        description: "Turn bot processing on/off",

        async execute(sock, msg, args, isOwner) {

            if (!isOwner) return;

            const botNumber = getBotNumber(sock);

            if (!botNumber) {
                return send(sock, msg, "❌ Bot number not available.");
            }

            const action = args?.[0]?.toLowerCase();

            if (!action) {

                const config = getSettings(botNumber);

                return send(
                    sock,
                    msg,
                    `⚙️ Bot Online: *${config.botOnline !== false ? "ON" : "OFF"}*\n\nUse:\n${getPrefix()}botonline on\n${getPrefix()}botonline off`
                );
            }

            const state = getState(action);

            if (state === null) {
                return send(
                    sock,
                    msg,
                    "⚠️ Use *on* or *off*."
                );
            }

            updateSetting(botNumber, "botOnline", state);

            return send(
                sock,
                msg,
                `✅ Bot Online turned *${state ? "ON" : "OFF"}*.\n\n${state
                    ? "🤖 Bot will now process messages."
                    : "⏸️ Bot is now paused for normal users."}`
            );
        }
    },

    // ═══════════════════════════════════════════
    // 4. AUTO DL GROUP
    // ═══════════════════════════════════════════

    {
        name: "autodlgroup",
        alias: ["dlgroup", "autodlgroups"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleBoolean(
                sock,
                msg,
                args,
                "autoDlAllGroups",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 5. AUTO DL DM
    // ═══════════════════════════════════════════

    {
        name: "autodldm",
        alias: ["dldm", "autodldms"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleBoolean(
                sock,
                msg,
                args,
                "autoDlAllDms",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 6. ANTI DELETE
    // ═══════════════════════════════════════════

    {
        name: "antidelete",
        alias: ["antidel"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleChatSetting(
                sock,
                msg,
                args,
                "antiDeleteChats",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 7. WELCOME
    // ═══════════════════════════════════════════

    {
        name: "welcome",
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleChatSetting(
                sock,
                msg,
                args,
                "welcomeChats",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 8. GOODBYE
    // ═══════════════════════════════════════════

    {
        name: "goodbye",
        alias: ["bye"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleChatSetting(
                sock,
                msg,
                args,
                "goodbyeChats",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 9. ANTI LINK
    // ═══════════════════════════════════════════

    {
        name: "antilink",
        alias: ["antil"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleChatSetting(
                sock,
                msg,
                args,
                "antilinkChats",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 10. CALL REJECT
    // ═══════════════════════════════════════════

    {
        name: "callreject",
        alias: ["rejectcall"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleBoolean(
                sock,
                msg,
                args,
                "callReject",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 11. AUTO READ
    // ═══════════════════════════════════════════

    {
        name: "autoread",
        alias: ["read", "autoread"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleBoolean(
                sock,
                msg,
                args,
                "autoRead",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 12. AUTO REACT
    // ═══════════════════════════════════════════

    {
        name: "autoreact",
        alias: ["react"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleBoolean(
                sock,
                msg,
                args,
                "autoReact",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 13. AUTO REPLY
    // ═══════════════════════════════════════════

    {
        name: "autoreply",
        alias: ["reply"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleBoolean(
                sock,
                msg,
                args,
                "autoReply",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 14. WITHOUT HANDLER
    // ═══════════════════════════════════════════

    {
        name: "withouthandler",
        alias: ["handler", "without"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleBoolean(
                sock,
                msg,
                args,
                "withoutHandler",
                isOwner
            );
        }
    },

    // ═══════════════════════════════════════════
    // 15. AUTO STATUS
    // ═══════════════════════════════════════════

    {
        name: "autostatus",
        alias: ["statusview", "status"],
        category: "owner",

        async execute(sock, msg, args, isOwner) {

            await toggleBoolean(
                sock,
                msg,
                args,
                "autoStatusView",
                isOwner
            );
        }
    }
];