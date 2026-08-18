// plugins/settings.js
const { getSettings, updateSetting } = require('../lib/database');

// കോമൺ ഫംഗ്ഷൻ: ഡാറ്റാബേസ് അപ്ഡേറ്റ് ചെയ്യാനും മെസ്സേജ് അയക്കാനും
async function toggleSetting(sock, msg, settingName, state, isArray = false) {
    const jid = msg.key.remoteJid;
    const botNumber = sock.user?.id?.split(':')[0].replace(/[^0-9]/g, '') || process.env.BOT_NUMBER.replace(/[^0-9]/g, '');
    const config = getSettings(botNumber);
    const prefix = process.env.PREFIX || '.';

    if (!state) {
        return await sock.sendMessage(jid, { 
            text: `⚠️ *Please provide ON or OFF!*\nExample: ${prefix}${msg.message?.conversation?.split(" ")[0].substring(1)} on` 
        }, { quoted: msg });
    }

    const isOn = state === "on" || state === "true";
    const isOff = state === "off" || state === "false";
    
    if (!isOn && !isOff) {
        return await sock.sendMessage(jid, { text: "⚠️ Use 'on' or 'off'" }, { quoted: msg });
    }

    if (isArray) {
        let arr = config[settingName] || [];
        if (isOn && !arr.includes(jid)) {
            arr.push(jid);
        } else if (isOff) {
            arr = arr.filter(x => x !== jid);
        }
        updateSetting(botNumber, settingName, arr);
    } else {
        updateSetting(botNumber, settingName, isOn);
    }

    await sock.sendMessage(jid, { 
        text: `✅ *${settingName.toUpperCase()}* turned *${isOn ? "ON" : "OFF"}*` 
    }, { quoted: msg });
}

module.exports = [
    // 1. SETTINGS MENU
    {
        name: "settings",
        alias: ["set", "config"],
        category: "owner",
        description: "Show bot settings menu",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            const jid = msg.key.remoteJid;
            let botNumber = sock.user?.id?.split(':')[0].replace(/[^0-9]/g, '');
            if (!botNumber) botNumber = process.env.BOT_NUMBER.replace(/[^0-9]/g, '');
            const config = getSettings(botNumber);
            const prefix = process.env.PREFIX || '.';

            const menuText = `╭━━━〔 ⚙️ *BOT SETTINGS* 〕━━━⬣
┃ 
┃ 01. *Mode* : ⟨ ${config.botMode?.toUpperCase() || global.botMode?.toUpperCase() || "PUBLIC"} ⟩
┃ 02. *Auto DL Groups* : ⟨ ${config.autoDlAllGroups ? "ON" : "OFF"} ⟩
┃ 03. *Auto DL DM* : ⟨ ${config.autoDlAllDms ? "ON" : "OFF"} ⟩
┃ 04. *Anti Delete* : ⟨ ${(config.antiDeleteChats || []).includes(jid) ? "ON" : "OFF"} ⟩
┃ 05. *Welcome* : ⟨ ${(config.welcomeChats || []).includes(jid) ? "ON" : "OFF"} ⟩
┃ 06. *Goodbye* : ⟨ ${(config.goodbyeChats || []).includes(jid) ? "ON" : "OFF"} ⟩
┃ 07. *Anti Link* : ⟨ ${(config.antilinkChats || []).includes(jid) ? "ON" : "OFF"} ⟩
┃ 08. *Call Reject* : ⟨ ${config.callReject ? "ON" : "OFF"} ⟩
┃ 09. *Bot Online* : ⟨ ${config.botOnline ? "ON" : "OFF"} ⟩
┃ 10. *Auto Read* : ⟨ ${config.autoRead ? "ON" : "OFF"} ⟩
┃ 11. *Auto React* : ⟨ ${config.autoReact ? "ON" : "OFF"} ⟩
┃ 12. *Auto Reply* : ⟨ ${config.autoReply ? "ON" : "OFF"} ⟩
┃ 13. *Without Handler* : ⟨ ${config.withoutHandler ? "ON" : "OFF"} ⟩
┃ 14. *Auto Status* : ⟨ ${config.autoStatusView ? "ON" : "OFF"} ⟩
┃
┣ 📌 *How to change?*
┃ ➾ ${prefix}<name> <on/off>
┃
┃ *Examples:*
┃ ➾ ${prefix}mode private
┃ ➾ ${prefix}botonline off
╰━━━━━━━━━━━━━━━━━━━⬣`;

            await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
        }
    },
    
    // 2. MODE (BULLETPROOF FIX)
    {
        name: "mode",
        category: "owner",
        description: "Change bot mode",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return; 
            const jid = msg.key.remoteJid;
            const state = args[0] ? args[0].toLowerCase() : "";
            
            if (state !== "public" && state !== "private") {
                return await sock.sendMessage(jid, { text: "⚠️ Use 'public' or 'private'" }, { quoted: msg });
            }
            
            // 🔥 കൃത്യമായി ബോട്ടിന്റെ നമ്പർ എടുക്കുന്നു
            let botNumber = sock.user?.id?.split(':')[0].replace(/[^0-9]/g, '');
            if (!botNumber && process.env.BOT_NUMBER) {
                botNumber = process.env.BOT_NUMBER.replace(/[^0-9]/g, '');
            }

            updateSetting(botNumber, "botMode", state);
            global.botMode = state; // Backup Check
            
            await sock.sendMessage(jid, { text: `✅ *MODE* changed to *${state.toUpperCase()}*` }, { quoted: msg });
        }
    },

    // 3. AUTO DL GROUP
    {
        name: "autodlgroup",
        alias: ["dlgroup"],
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "autoDlAllGroups", args[0]?.toLowerCase());
        }
    },

    // 4. AUTO DL DM
    {
        name: "autodldm",
        alias: ["dldm"],
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "autoDlAllDms", args[0]?.toLowerCase());
        }
    },

    // 5. ANTI DELETE
    {
        name: "antidelete",
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "antiDeleteChats", args[0]?.toLowerCase(), true);
        }
    },

    // 6. WELCOME
    {
        name: "welcome",
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "welcomeChats", args[0]?.toLowerCase(), true);
        }
    },

    // 7. GOODBYE
    {
        name: "goodbye",
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "goodbyeChats", args[0]?.toLowerCase(), true);
        }
    },

    // 8. ANTI LINK
    {
        name: "antilink",
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "antilinkChats", args[0]?.toLowerCase(), true);
        }
    },

    // 9. CALL REJECT
    {
        name: "callreject",
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "callReject", args[0]?.toLowerCase());
        }
    },

    // 10. BOT ONLINE
    {
        name: "botonline",
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "botOnline", args[0]?.toLowerCase());
        }
    },

    // 11. AUTO READ
    {
        name: "autoread",
        alias: ["read"],
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "autoRead", args[0]?.toLowerCase());
        }
    },

    // 12. AUTO REACT
    {
        name: "autoreact",
        alias: ["react"],
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "autoReact", args[0]?.toLowerCase());
        }
    },

    // 13. AUTO REPLY
    {
        name: "autoreply",
        alias: ["reply"],
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "autoReply", args[0]?.toLowerCase());
        }
    },

    // 14. WITHOUT HANDLER
    {
        name: "withouthandler",
        alias: ["handler"],
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "withoutHandler", args[0]?.toLowerCase());
        }
    },

    // 15. AUTO STATUS VIEW
    {
        name: "autostatus",
        alias: ["statusview", "status"],
        category: "owner",
        async execute(sock, msg, args, isOwner) {
            if (!isOwner) return;
            await toggleSetting(sock, msg, "autoStatusView", args[0]?.toLowerCase());
        }
    }
];