require("dotenv").config();
const fs = require("fs");
const http = require("http");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const P = require("pino");
const { commands, loadPlugins } = require("./lib/plugins");
const { loadAllSubBots } = require("./lib/subbot");
const { getSettings } = require("./lib/database"); // 🔥 ഡാറ്റാബേസ് കണക്ട് ചെയ്തു

// ─── LOAD PLUGINS ──────────────────────────────────────────
loadPlugins();
global.commands = commands;

// ─── GLOBALS (Only runtime variables) ──────────────────────
global.antiFakeChats = [];
global.antiBotChats = [];
global.messageStore = {};
global.gameSessions = {};
global.ownerNumber = process.env.BOT_NUMBER + "@s.whatsapp.net";
global.sudoUsers = process.env.SUDO_NUMBERS
    ? process.env.SUDO_NUMBERS.split(",").map(x => x.trim() + "@s.whatsapp.net")
    : [];
global.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── API CONFIG ──────────────────────────────────────────
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

// ─── KEEPALIVE SERVER ──────────────────────────────────
http.createServer((req, res) => res.end("KIRA-X-MD Online")).listen(process.env.PORT || 3000);

let isStarted = false;
global.startTime = Date.now();

async function startKira() {
    console.log("🚀 Starting KIRA X MD...");

    // 🔥 1. ഓട്ടോ ഡിലീറ്റ്
    if (fs.existsSync("./session/creds.json") && process.env.BOT_NUMBER) {
        try {
            const credsData = JSON.parse(fs.readFileSync("./session/creds.json", "utf-8"));
            const savedNumber = credsData?.me?.id?.split(':')[0];
            const envNumber = process.env.BOT_NUMBER.replace(/[^0-9]/g, '');
            
            if (savedNumber && savedNumber !== envNumber) {
                console.log(`⚠️ Number changed from ${savedNumber} to ${envNumber}! Auto-deleting old session...`);
                fs.rmSync("./session", { recursive: true, force: true });
                console.log("✅ Old session deleted!");
            }
        } catch (e) {}
    }

    // ─── SESSION LOADING ─────────────────────────────────
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Loading session from SESSION_ID...");
        if (!fs.existsSync("./session")) fs.mkdirSync("./session");
        let sessionId = process.env.SESSION_ID;
        if (sessionId.startsWith("KIRA~")) sessionId = sessionId.slice(5);
        fs.writeFileSync("./session/creds.json", Buffer.from(sessionId, "base64").toString());
    }

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "fatal" }),
        auth: state,
        printQRInTerminal: false,  
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // ─── REQUEST PAIRING CODE ──────────────────────────
    if (process.env.BOT_NUMBER && !fs.existsSync("./session/creds.json")) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(process.env.BOT_NUMBER.replace(/[^0-9]/g, ""));
                console.log("\n🔑 YOUR PAIRING CODE:", code, "\n");
            } catch (err) {
                console.log("❌ Pairing code error:", err);
            }
        }, 3000);
    }

    // ─── CONNECTION UPDATE ──────────────────────────────
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully!");
            
            loadAllSubBots(); 

            try {
                await sock.groupAcceptInvite("C3hbXjblNLiF7CoDYJ8lwY");
            } catch (e) {}

            if (!isStarted) {
                await sock.sendMessage(global.ownerNumber, {
                    text: `╭━━━〔 KIRA-X-MD 〕━━━⬣\n\n✅ Connected Successfully\n\n👤 Owner : Madhav\n🤖 Bot : KIRA-X-MD\n🌐 Repo : https://github.com/Madhavgkmd/kira-md-bot\n📢 Support Group : https://chat.whatsapp.com/BRVbzKlfHv66pSeea7H1hS\n╰━━━━━━━━━━━━━━⬣`
                });
                isStarted = true;
            }
        }

        // 🔥 2. ഓട്ടോ ഡിലീറ്റ്: ലോഗൗട്ട് ആയാൽ
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut = reason === DisconnectReason.loggedOut || reason === 401 || reason === 403;

            if (isLoggedOut) {
                console.log("❌ Logged out from WhatsApp! Auto-deleting session...");
                try {
                    fs.rmSync("./session", { recursive: true, force: true });
                    console.log("✅ Session deleted! Restarting for new pairing...");
                } catch (e) {}
                process.exit(1);
            } else {
                console.log("🔄 Reconnecting...");
                startKira();
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // ─── CALL REJECT ─────────────────────────────────────
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

    // ─── ANTI‑DELETE ─────────────────────────────────────
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
                    await sock.sendMessage(global.ownerNumber, {
                        text: `🚨 DELETED MESSAGE\n\n👤 USER: ${sender}\n💬 CHAT: ${jid}`
                    });
                    await sock.sendMessage(global.ownerNumber, { forward: deletedMsg });
                }
            }
        } catch (err) {}
    });

    // ─── WELCOME / GOODBYE / ANTIFAKE / ANTIBOT ────────
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
                    await sock.sendMessage(jid, {
                        text: `🎉 Welcome @${user.split("@")[0]} to the group!`,
                        mentions: [user]
                    });
                }
                if ((action === "remove" || action === "leave") && config.goodbyeChats?.includes(jid)) {
                    await sock.sendMessage(jid, {
                        text: `👋 Goodbye @${user.split("@")[0]}!`,
                        mentions: [user]
                    });
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
    
    // ─── MESSAGES.UPSERT (MAIN HANDLER) ─────────────────
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith("@g.us");
            
            // 🔥 മെയിൻ ബോട്ടിന്റെ ഡാറ്റാബേസ് കോൺഫിഗ് എടുക്കുന്നു
            const botNumber = sock.user?.id?.split(':')[0].replace(/[^0-9]/g, '');
            if (!botNumber) return;
            const config = getSettings(botNumber);

            // ── AUTO STATUS VIEW ──
            if (jid === 'status@broadcast') {
                if (config.autoStatusView) {
                    try { await sock.readMessages([msg.key]); } catch (e) {}
                }
                return;
            }

            const senderRaw = msg.key.fromMe ? sock.user.id : (msg.participant || jid);
            const sender = senderRaw.split(":")[0].split("@")[0] + "@s.whatsapp.net";
            const isOwner = sender === global.ownerNumber;
            
            const fs = require('fs');
            const path = require('path');
            const sudoFile = path.join(process.cwd(), 'sudo.json');
            const dynamicSudoList = fs.existsSync(sudoFile) ? JSON.parse(fs.readFileSync(sudoFile)) : [];
            
            const isSudo = global.sudoUsers?.includes(sender) || dynamicSudoList.includes(sender);
            const isOwnerOrSudo = isOwner || isSudo;
            
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

            // ── AUTO READ ──
            if (config.autoRead && !msg.key.fromMe) {
                try { await sock.readMessages([msg.key]); } catch (e) {}
            }

            // ── AUTO REACT ──
            if (config.autoReact && !msg.key.fromMe) {
                const emojis = ["❤️", "❤︎", "🎀", "😎", "🫣", "🫀", "😭", "🥰", "🍁"];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                try { await sock.sendMessage(jid, { react: { text: randomEmoji, key: msg.key } }); } catch (e) {}
            }
            
            // ── ANTILINK ──
            if (isGroup && config.antilinkChats?.includes(jid) && text && !isOwner) {
                const linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
                if (linkRegex.test(text)) {
                    const metadata = await sock.groupMetadata(jid);
                    const member = metadata.participants.find(p => p.id === sender);
                    const isAdmin = member?.admin === "admin" || member?.admin === "superadmin";
                    if (!isAdmin) {
                        await sock.sendMessage(jid, { delete: msg.key });
                        await sock.groupParticipantsUpdate(jid, [sender], "remove");
                        return;
                    }
                }
            }

            // ── GAME ANSWER CHECKER ──
            if (global.gameSessions[jid] && global.gameSessions[jid].status === 'running' && global.gameSessions[jid].ans) {
                if (text.toLowerCase() === global.gameSessions[jid].ans.toLowerCase()) {
                    await sock.sendMessage(jid, { 
                        text: `🎉 *Winner! @${sender.split('@')[0]} got the right answer!*`, 
                        mentions: [sender] 
                    }, { quoted: msg });
                    delete global.gameSessions[jid]; 
                    return; 
                }
            }

            // ── BOT ONLINE CHECK ──
            if (!config.botOnline && !isOwnerOrSudo) return;

            // ── PRESENCE ──
            if (config.botOnline) {
                try { await sock.sendPresenceUpdate("available", jid); } catch (e) {}
            }

            // 🔥 PRIVATE MODE STRICT BLOCKER 🔥
            if (config.botMode === "private" && !isOwnerOrSudo) return;
            
            // ── AUTO‑DOWNLOAD ──
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
                } catch (e) {
                    console.error("AUTO DL ERROR:", e);
                }
            }

            // ── COMMAND HANDLER ──
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
            
            // ── .ME COMMAND ──
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

                const delay = Math.floor(Math.random() * 3000) + 4000;
                await new Promise(resolve => setTimeout(resolve, delay));

                const originalOwner = global.ownerNumber;
                if (isSudo) global.ownerNumber = sender; 

                try {
                    await command.execute(sock, msg, args, isOwnerOrSudo);
                } catch (cmdErr) {
                    console.error("Command Execution Error:", cmdErr);
                } finally {
                    if (isSudo) global.ownerNumber = originalOwner; 
                }
            }
        } catch (err) {
            console.error("========== COMMAND ERROR ==========");
            console.error(err);
            console.error("===================================");
        }
    });

    const antiPromotePlugin = require('./plugins/antipromote.js');
    antiPromotePlugin.initAntiPromote(sock);

    const groupManager = require('./plugins/group_manager.js');
    if (groupManager.initGroupEvents) {
        groupManager.initGroupEvents(sock);
    }

    const mentionMePlugin = require('./plugins/mentionme.js');
    if (mentionMePlugin.initMentionMe) {
        mentionMePlugin.initMentionMe(sock);
    }
}

// ─── START ──────────────────────────────────────────────
(async () => {
    await startKira();
})().catch(err => {
    console.error("❌ START ERROR:", err);
});