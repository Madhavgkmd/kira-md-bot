const { getSettings, updateSetting } = require('../lib/database');

module.exports = [
    {
        name: "autodl",
        alias: ["adl"],
        category: "owner",
        description: "Auto Downloader",

        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;
            
            // 🔥 മെയിൻ ബോട്ട് ആണോ പെയർ ബോട്ട് ആണോ എന്ന് കൃത്യമായി നമ്പറെടുത്ത് തിരിച്ചറിയുന്നു
            const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
            const config = getSettings(botNumber);

            let autoDlChats = config.autoDlChats || [];

            const action = (args[0] || "").toLowerCase();
            const target = (args[1] || "").toLowerCase();

            if (action === "on") {
                if (target === "groups") {
                    updateSetting(botNumber, "autoDlAllGroups", true);
                    return sock.sendMessage(jid, { text: "✅ AutoDL enabled for all groups (This bot only)." }, { quoted: msg });
                }

                if (target === "dms") {
                    updateSetting(botNumber, "autoDlAllDms", true);
                    return sock.sendMessage(jid, { text: "✅ AutoDL enabled for all DMs (This bot only)." }, { quoted: msg });
                }

                if (!autoDlChats.includes(jid)) {
                    autoDlChats.push(jid);
                    updateSetting(botNumber, "autoDlChats", autoDlChats);
                }
                return sock.sendMessage(jid, { text: "✅ AutoDL enabled in this chat (This bot only)." }, { quoted: msg });
            }

            if (action === "off") {
                if (target === "groups") {
                    updateSetting(botNumber, "autoDlAllGroups", false);
                    return sock.sendMessage(jid, { text: "❌ AutoDL disabled for all groups (This bot only)." }, { quoted: msg });
                }

                if (target === "dms") {
                    updateSetting(botNumber, "autoDlAllDms", false);
                    return sock.sendMessage(jid, { text: "❌ AutoDL disabled for all DMs (This bot only)." }, { quoted: msg });
                }

                autoDlChats = autoDlChats.filter(x => x !== jid);
                updateSetting(botNumber, "autoDlChats", autoDlChats);
                return sock.sendMessage(jid, { text: "❌ AutoDL disabled in this chat (This bot only)." }, { quoted: msg });
            }

            if (action === "status") {
                return sock.sendMessage(jid, {
                    text: `╭──〔 AUTO DL STATUS 〕
├ Chat : ${autoDlChats.includes(jid) ? "ON" : "OFF"}
├ Groups : ${config.autoDlAllGroups ? "ON" : "OFF"}
├ DMs : ${config.autoDlAllDms ? "ON" : "OFF"}
╰────────────`
                }, { quoted: msg });
            }

            return sock.sendMessage(jid, {
                text: `╭──〔 AUTO DL 〕
├ .autodl on
├ .autodl off
├ .autodl status
├ .autodl on groups
├ .autodl off groups
├ .autodl on dms
╰ .autodl off dms`
            }, { quoted: msg });
        }
    }
];

// ─── AUTO DOWNLOADER HANDLER ───
async function handleAutoDownload(text, sock, msg) {
    try {
        const jid = msg.key.remoteJid;
        const isGroup = jid.endsWith("@g.us");
        const commands = global.commands || [];

        // 🔥 ആ ബോട്ടിന്റെ സ്വന്തം ഡാറ്റാബേസ് സെറ്റിങ്സ് മാത്രം എടുക്കുന്നു
        const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        const config = getSettings(botNumber);

        const enabled =
            config.autoDlChats?.includes(jid) ||
            (config.autoDlAllGroups && isGroup) ||
            (config.autoDlAllDms && !isGroup);

        if (!enabled || !text) {
            return false;
        }

        const url = text.trim();

        // Instagram
        if (/instagram\.com/i.test(url)) {
            const cmd = commands.find(c => c.name === "insta");
            if (cmd) {
                await cmd.execute(sock, msg, [url]);
                return true;
            }
        }

        // Facebook
        if (/facebook\.com|fb\.watch/i.test(url)) {
            const cmd = commands.find(c => c.name === "fb");
            if (cmd) {
                await cmd.execute(sock, msg, [url]);
                return true;
            }
        }

        // YouTube
        if (/youtube\.com|youtu\.be/i.test(url)) {
            const cmd = commands.find(c => c.name === "ytv");
            if (cmd) {
                await cmd.execute(sock, msg, [url]);
                return true;
            }
        }

        // TikTok
        if (/https?:\/\/(?:www\.|m\.|vm\.|vt\.)?tiktok\.com/i.test(url)) {
            const cmd = commands.find(c => c.name === "tiktok");
            if (cmd) {
                await cmd.execute(sock, msg, [url]);
                return true;
            }
        }
        
        // Twitter / X
        if (/twitter\.com|x\.com/i.test(url)) {
            const cmd = commands.find(c => c.name === "twitter");
            if (cmd) {
                await cmd.execute(sock, msg, [url]);
                return true;
            }
        }

        return false;

    } catch (err) {
        return false;
    }
}

module.exports.handleAutoDownload = handleAutoDownload;