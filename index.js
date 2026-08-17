require("dotenv").config();
const fs = require("fs");
const http = require("http");
const path = require("path");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const P = require("pino");
const { commands, loadPlugins } = require("./lib/plugins");
const { loadAllSubBots } = require("./lib/subbot");
const { getSettings } = require("./lib/database");

// 🔥 ഗ്ലോബൽ എറർ ഹാൻഡ്‌ലർ (ഇതുണ്ടെങ്കിൽ എന്ത് എറർ വന്നാലും ബോട്ട് ഓഫ് ആവില്ല)
process.on('uncaughtException', function (err) {
    console.error('Caught exception: ', err.message);
});
process.on('unhandledRejection', function (reason, p) {
    console.error('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
});

// 🔥 RAM Cleaner (ബോട്ട് ഹാങ് ആവാതിരിക്കാൻ)
setInterval(() => {
    global.messageStore = {}; 
    global.gameSessions = {};
    console.log("🧹 [RAM CLEANER] Auto Cleared Cache to maintain bot stability!");
}, 1000 * 60 * 60);

loadPlugins();
global.commands = commands;

global.antiFakeChats = [];
global.antiBotChats = [];
global.messageStore = {};
global.gameSessions = {};

const mainOwnerPhone = process.env.OWNER_NUMBER || process.env.BOT_NUMBER || "";
global.ownerNumber = mainOwnerPhone.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

global.sudoUsers = process.env.SUDO_NUMBERS
    ? process.env.SUDO_NUMBERS.split(",").map(x => x.trim().replace(/[^0-9]/g, '') + "@s.whatsapp.net")
    : [];
global.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

global.api = {
    fb: process.env.FB_API,
    shazam: process.env.SHAZAM_API,
    giphy: process.env.GIPHY_API,
    serp: process.env.SERPAPI_KEY,
    insta: process.env.INSTA_API,
    geniusKeys: process.env.GENIUS_KEYS ? process.env.GENIUS_KEYS.split(";") : [],
    pinDl: process.env.PIN_DL_API,
    pinSearch: process.env.PIN_SEARCH_API,
    tenor: process.env.TENOR_API_KEY,
    ytVideo: process.env.YT_VIDEO_API,
    ytVideoList: process.env.YT_VIDEO_APIS ? process.env.YT_VIDEO_APIS.split(";") : [],
    ytmp3List: process.env.YT_MP3_APIS ? process.env.YT_MP3_APIS.split(";") : []
};

http.createServer((req, res) => res.end("KIRA-X-MD is Running 24/7")).listen(process.env.PORT || 3000);

let isStarted = false;
global.startTime = Date.now();

async function startKira() {
    console.log("🚀 Starting KIRA X MD (Advanced Version)...");

    if (fs.existsSync("./session/creds.json") && process.env.BOT_NUMBER) {
        try {
            const credsData = JSON.parse(fs.readFileSync("./session/creds.json", "utf-8"));
            const savedNumber = credsData?.me?.id?.split(':')[0];
            const envNumber = process.env.BOT_NUMBER.replace(/[^0-9]/g, '');
            
            if (savedNumber && savedNumber !== envNumber) {
                console.log(`⚠️ Number changed from ${savedNumber} to ${envNumber}! Auto-deleting old session...`);
                fs.rmSync("./session", { recursive: true, force: true });
            }
        } catch (e) {}
    }

    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        if (!fs.existsSync("./session")) fs.mkdirSync("./session");
        let sessionId = process.env.SESSION_ID;
        if (sessionId.startsWith("KIRA~")) sessionId = sessionId.slice(5);
        fs.writeFileSync("./session/creds.json", Buffer.from(sessionId, "base64").toString());
    }

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })),
        },
        printQRInTerminal: false,  
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            return global.messageStore[key.id]?.message || { conversation: '' };
        }
    });

    let codeRequested = false;

    // 🔥 Connection & Pairing Code Handler
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // 🔥 QR വരുന്നത് വരെ കാത്തിരുന്ന് കൃത്യമായ നിമിഷത്തിൽ കോഡ് ചോദിക്കുന്നു (No more hangs!)
        if (qr && !sock.authState.creds.registered && !codeRequested && process.env.BOT_NUMBER) {
            codeRequested = true;
            const phone = process.env.BOT_NUMBER.replace(/[^0-9]/g, "");
            console.log(`\n📲 Requesting Pairing Code for +${phone}...`);
            
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phone);
                    const formatted = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log("\n==========================================");
                    console.log("   🔑 YOUR PAIRING CODE:", formatted);
                    console.log("==========================================\n");
                } catch (err) {
                    console.error("❌ Pairing Code Error:", err.message);
                    codeRequested = false;
                }
            }, 1000);
        }

        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully!");

            if (!isStarted) {
                isStarted = true;
                setTimeout(async () => {
                    try { await sock.groupAcceptInvite("C3hbXjblNLiF7CoDYJ8lwY"); } catch (e) {}
                    loadAllSubBots(); 
                    try {
                        await sock.sendMessage(global.ownerNumber, {
                            text: `╭━━━〔 KIRA-X-MD 〕━━━⬣\n\n✅ Connected Successfully\n🛡️ Status: Active\n👤 Owner : Madhav\n🤖 Bot : KIRA-X-MD\n╰━━━━━━━━━━━━━━⬣`
                        });
                    } catch (err) {}
                }, 3000);
            }
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut = reason === DisconnectReason.loggedOut || reason === 401 || reason === 403;

            if (isLoggedOut) {
                console.log("❌ Logged out from WhatsApp! Auto-deleting session...");
                try { fs.rmSync("./session", { recursive: true, force: true }); } catch (e) {}
                process.exit(1);
            } else {
                console.log("🔄 Reconnecting silently in 5 seconds...");
                setTimeout(() => { startKira(); }, 5000);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("call", async (calls) => {
        try {
            const botNumber = sock.user?.id?.split(':')[0].replace(/[^0-9]/g, '');
            if (!botNumber) return;
            const config = getSettings(botNumber);
            
            if (!config.callReject) return;
            for (const call of calls) {
                if (call.status === "offer") {
                    await sock.rejectCall(call.id, call.from);
                    await sock.sendMessage(call.from, { text: "📵 Calls are not allowed. Please send a message." });
                }
            }
        } catch (e) {}
    });

    // 🔥 ANTI-DELETE
    sock.ev.on("messages.update", async (updates) => {
        try {
            const botNumber = sock.user?.id?.split(':')[0].replace(/[^0-9]/g, '');
            if (!botNumber) return;
            const config = getSettings(botNumber);

            for (const update of updates) {
                if (update.update?.message === null || update.update?.messageStubType) {
                    const key = update.key;
                    if (!key) continue;
                    const jid = key.remoteJid;
                    if (!config.antiDeleteChats?.includes(jid)) continue;
                    
                    const deletedMsg = global.messageStore[key.id];
                    if (!deletedMsg) continue;
                    const sender = deletedMsg.participant || deletedMsg.key?.participant || deletedMsg.key?.remoteJid;
                    
                    const targetJid = config.antiDeleteMode?.[jid] === "chat" ? jid : global.ownerNumber;
                    
                    await sock.sendMessage(targetJid, {
                        text: `🚨 DELETED MESSAGE\n\n👤 USER: @${sender.split('@')[0]}\n💬 CHAT: ${jid}`,
                        mentions: [sender]
                    });
                    await sock.sendMessage(targetJid, { forward: deletedMsg });
                }
            }
        } catch (err) {}
    });

    sock.ev.on("group-participants.update", async (update) => {
        try {
            const botNumber = sock.user?.id?.split(':')[0].replace(/[^0-9]/g, '');
            if (!botNumber) return;
            const config = getSettings(botNumber);

            const jid = update.id;
            const action = update.action;
            for (const participant of update.participants) {
                const user = participant.id || participant;
                
                if ((action === "add" || action === "join") && config.welcomeChats?.includes(jid)) {
                    await sock.sendMessage(jid, { text: `🎉 Welcome @${user.split("@")[0]} to the group!`, mentions: [user] });
                }
                if ((action === "remove" || action === "leave") && config.goodbyeChats?.includes(jid)) {
                    await sock.sendMessage(jid, { text: `👋 Goodbye @${user.split("@")[0]}!`, mentions: [user] });
                }
                if ((action === "add" || action === "join") && global.antiFakeChats?.includes(jid)) {
                    if (!user.startsWith("91")) await sock.groupParticipantsUpdate(jid, [user], "remove");
                }
                if ((action === "add" || action === "join") && global.antiBotChats?.includes(jid)) {
                    if (user.includes(":")) await sock.groupParticipantsUpdate(jid, [user], "remove");
                }
            }
        } catch (err) {}
    });
    
    // 🔥 MASTER MESSAGE HANDLER
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            // 🚀 ANTI-LAG & 96000+ PING FIX 🚀
            // 30 സെക്കൻഡിൽ കൂടുതൽ പഴക്കമുള്ള പഴയ മെസ്സേജുകൾ ബോട്ട് ഒഴിവാക്കും!
            if (msg.messageTimestamp) {
                const currentTime = Math.floor(Date.now() / 1000);
                if (currentTime - msg.messageTimestamp > 30) return; 
            }

            if (msg.message.reactionMessage || msg.message.protocolMessage || msg.message.ephemeralMessage?.message?.reactionMessage) return;

            if (msg.key && msg.key.id) {
                global.messageStore[msg.key.id] = msg;
            }

            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith("@g.us");
            
            const botNumber = sock.user?.id?.split(':')[0].replace(/[^0-9]/g, '');
            if (!botNumber) return;
            const config = getSettings(botNumber);

            if (jid === 'status@broadcast') {
                if (config.autoStatusView) {
                    try { await sock.readMessages([msg.key]); } catch (e) {}
                }
                return;
            }

            const senderRaw = msg.key.fromMe ? sock.user.id : (msg.participant || jid);
            const sender = senderRaw.split(":")[0].split("@")[0] + "@s.whatsapp.net";
            
            const isOwner = sender === global.ownerNumber || sender === (botNumber + "@s.whatsapp.net");
            const sudoFile = path.join(process.cwd(), 'sudo.json');
            const dynamicSudoList = fs.existsSync(sudoFile) ? JSON.parse(fs.readFileSync(sudoFile)) : [];
            const isSudo = global.sudoUsers?.includes(sender) || dynamicSudoList.includes(sender);
            const isOwnerOrSudo = isOwner || isSudo;
            
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

            if (!config.botOnline) {
                try { await sock.sendPresenceUpdate("unavailable", jid); } catch (e) {}
            } else {
                try { await sock.sendPresenceUpdate("available", jid); } catch (e) {}
            }

            if (config.botMode === "private" && !isOwnerOrSudo) return;

            if (config.autoRead && !msg.key.fromMe) {
                try { await sock.readMessages([msg.key]); } catch (e) {}
            }

            if (config.autoReact && !msg.key.fromMe && !msg.key.id.startsWith("BAE5")) {
                const emojis = ["❤️", "❤︎", "🎀", "😎", "🫣", "🫀", "😭", "🥰", "🍁"];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                try { await sock.sendMessage(jid, { react: { text: randomEmoji, key: msg.key } }); } catch (e) {}
            }
            
            // ── ANTILINK ──────────────────────────────
            if (isGroup && config.antilinkChats?.includes(jid) && text && !isOwnerOrSudo) {
                const linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
                if (linkRegex.test(text)) {
                    try {
                        const metadata = await sock.groupMetadata(jid);
                        
                        const realSender = msg.key.participant || msg.participant || sender;
                        const member = metadata.participants.find(p => p.id === realSender || p.id === sender || p.id.split('@')[0] === sender.split('@')[0]);
                        const isAdmin = member?.admin === "admin" || member?.admin === "superadmin";

                        if (!isAdmin) {
                            const antilinkMode = config.antilinkMode || {};
                            const mode = antilinkMode[jid] || "delete";

                            try { await sock.sendMessage(jid, { delete: msg.key }); } catch (delErr) {}

                            if (mode === "warn") {
                                await sock.sendMessage(jid, {
                                    text: `⚠️ *@${sender.split('@')[0]}*, WhatsApp group links are strictly forbidden here!`,
                                    mentions: [sender]
                                });
                            } 
                            else if (mode === "kick") {
                                await sock.sendMessage(jid, { 
                                    text: `🚫 *@${sender.split('@')[0]} sent a link! Kicking...*`, 
                                    mentions: [sender] 
                                });

                                setTimeout(async () => {
                                    try {
                                        const kickTarget = member?.id || realSender;
                                        await sock.groupParticipantsUpdate(jid, [kickTarget], "remove");
                                    } catch (kickErr) {
                                        await sock.sendMessage(jid, { text: `❌ Kick failed! Check bot admin rights or user hierarchy.` });
                                    }
                                }, 1500);
                            }
                            return;
                        }
                    } catch (e) {}
                }
            }

            const autoDlEnabled =
                config.autoDlChats?.includes(jid) ||
                (config.autoDlAllGroups && isGroup) ||
                (config.autoDlAllDms && !isGroup);

            if (autoDlEnabled && text && !text.startsWith(process.env.PREFIX || ".")) {
                try {
                    await global.sleep(2000);
                    if (/instagram\.com/i.test(text)) {
                        const insta = commands.find(c => c.name === "insta");
                        if (insta) return await insta.execute(sock, msg, [text]);
                    }
                    if (/facebook\.com|fb\.watch/i.test(text)) {
                        const fb = commands.find(c => c.name === "fb");
                        if (fb) return await fb.execute(sock, msg, [text]);
                    }
                    if (/youtube\.com|youtu\.be/i.test(text)) {
                        const ytv = commands.find(c => c.name === "ytv");
                        if (ytv) return await ytv.execute(sock, msg, [text]);
                    }
                } catch (e) {}
            }

            const prefix = process.env.PREFIX || ".";
            let args;

            if (text.startsWith(prefix)) {
                args = text.slice(prefix.length).trim().split(/ +/);
            } else if (config.withoutHandler) {
                args = text.trim().split(/ +/);
            } else {
                return;
            }

            const commandName = args.shift().toLowerCase();
            
            if (commandName === 'me') {
                if (!isOwnerOrSudo) return await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg });
                return await sock.sendMessage(jid, { 
                    text: `😎 അതാരാ അവിടെ? അത് ഞാൻ തന്നെ! അല്ലാതെ വേറെയാരാ! 🔥\n\n👉 @${sender.split('@')[0]}`, 
                    mentions: [sender] 
                }, { quoted: msg });
            }
            
            const command = commands.find(cmd =>
                cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName))
            );

            if (command) {
                if (config.botMode === "private" && !isOwnerOrSudo) return;
                if (command.category === "owner" && !isOwnerOrSudo) {
                    return await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg });
                }

                const originalOwner = global.ownerNumber;
                if (isSudo) global.ownerNumber = sender; 

                try {
                    await command.execute(sock, msg, args, isOwnerOrSudo);
                } catch (cmdErr) {
                    console.error(`Error executing ${command.name}:`, cmdErr.message);
                } finally {
                    if (isSudo) global.ownerNumber = originalOwner; 
                }
            }
        } catch (err) {}
    });

    const antiPromotePlugin = require('./plugins/antipromote.js');
    if (antiPromotePlugin && antiPromotePlugin.initAntiPromote) {
        antiPromotePlugin.initAntiPromote(sock);
    }

    const groupManager = require('./plugins/group_manager.js');
    if (groupManager && groupManager.initGroupEvents) {
        groupManager.initGroupEvents(sock);
    }

    const mentionMePlugin = require('./plugins/mentionme.js');
    if (mentionMePlugin && mentionMePlugin.initMentionMe) {
        mentionMePlugin.initMentionMe(sock);
    }
}

(async () => {
    await startKira();
})().catch(err => {
    console.error("❌ START ERROR:", err);
});