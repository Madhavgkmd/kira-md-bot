const { getSettings, updateSetting } = require('../lib/database');

module.exports = [
    {
        name: "autodl",
        alias: ["adl"],
        category: "owner",
        description: "Auto Downloader",

        async execute(sock, msg, args, isOwner) {
            const jid = msg.key.remoteJid;

            // 🔥 OWNER CHECK: Antilink-ൽ ഉള്ളത് പോലെ ഇവിടെയും ആഡ് ചെയ്തു!
            if (!isOwner) {
                return sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg });
            }

            const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
            
            // 🔥 SMART BOT TARGETING: ഏത് ബോട്ടിനെയാണോ ഉദ്ദേശിച്ചത് എന്ന് മനസ്സിലാക്കുന്നു
            const quotedId = msg.message?.extendedTextMessage?.contextInfo?.participant || "";
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            // ഗ്രൂപ്പിൽ വെച്ച് കമാൻഡ് അടിക്കുമ്പോൾ വേറെ ബോട്ടിനെ മെൻഷൻ ചെയ്താലോ റിപ്ലൈ ചെയ്താലോ ഈ ബോട്ട് മിണ്ടാതിരിക്കും!
            if (jid.endsWith("@g.us") && (quotedId !== "" || mentionedJid.length > 0)) {
                const isMeQuoted = quotedId.includes(botNumber);
                const isMeMentioned = mentionedJid.some(j => j.includes(botNumber));
                
                if (!isMeQuoted && !isMeMentioned) {
                    return; // ഇത് എനിക്കുള്ള കമാൻഡ് അല്ല, വേറെ ഏതോ പെയർ ബോട്ടിനുള്ളതാണ്!
                }
            }

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
                    text: `╭──〔 AUTO DL STATUS 〕\n├ Chat : ${autoDlChats.includes(jid) ? "ON" : "OFF"}\n├ Groups : ${config.autoDlAllGroups ? "ON" : "OFF"}\n├ DMs : ${config.autoDlAllDms ? "ON" : "OFF"}\n╰────────────`
                }, { quoted: msg });
            }

            return sock.sendMessage(jid, {
                text: `╭──〔 AUTO DL 〕\n├ .autodl on\n├ .autodl off\n├ .autodl status\n├ .autodl on groups\n├ .autodl off groups\n╰────────────────`
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

        if (/instagram\.com/i.test(url)) {
            const cmd = commands.find(c => c.name === "insta");
            if (cmd) { await cmd.execute(sock, msg, [url]); return true; }
        }
        if (/facebook\.com|fb\.watch/i.test(url)) {
            const cmd = commands.find(c => c.name === "fb");
            if (cmd) { await cmd.execute(sock, msg, [url]); return true; }
        }
        if (/youtube\.com|youtu\.be/i.test(url)) {
            const cmd = commands.find(c => c.name === "ytv");
            if (cmd) { await cmd.execute(sock, msg, [url]); return true; }
        }
        if (/https?:\/\/(?:www\.|m\.|vm\.|vt\.)?tiktok\.com/i.test(url)) {
            const cmd = commands.find(c => c.name === "tiktok");
            if (cmd) { await cmd.execute(sock, msg, [url]); return true; }
        }
        if (/twitter\.com|x\.com/i.test(url)) {
            const cmd = commands.find(c => c.name === "twitter");
            if (cmd) { await cmd.execute(sock, msg, [url]); return true; }
        }
        return false;
    } catch (err) {
        return false;
    }
}

module.exports.handleAutoDownload = handleAutoDownload;