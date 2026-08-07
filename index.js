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
// ─── LOAD PLUGINS ──────────────────────────────────────────
loadPlugins();
global.commands = commands;

// ─── GLOBALS ──────────────────────────────────────────────
global.callReject = false;
global.botOnline = true;
global.autoRead = false;
global.withoutHandler = false;
global.autoReact = false;
global.autoReply = false;
global.autoVV = false;
global.autoSticker = false;
global.antiWordChats = [];
global.badWords = [];
global.antiBotChats = [];
global.antiPromoteChats = [];
global.antiDemoteChats = [];
global.antiFakeChats = [];
global.antiSpamChats = [];
global.spamData = {};
global.warnData = {};
global.warnLimit = 3;
global.botMode = "public";
global.ownerNumber = process.env.BOT_NUMBER + "@s.whatsapp.net";
global.autoDlChats = [];
global.autoDlAllGroups = false;
global.autoDlAllDms = false;
global.antiDeleteChats = [];
global.messageStore = {};
global.callReject = false;
global.botOnline = true;
global.welcomeChats = [];
global.goodbyeChats = [];
global.gameSessions = {};
global.antilinkChats = [];
global.antilinkMode = {};
global.settingsMessages = [];
global.settingsReplies = {};
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
        printQRInTerminal: false,  // QR disabled, pairing code will be used
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // ─── REQUEST PAIRING CODE (IF NO SESSION) ──────────
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

    let codeSent = false;

    // ─── CONNECTION UPDATE ──────────────────────────────
    sock.ev.on("connection.update", async (update) => {
        // console.log("🔌 Connection update:", update);  // Optional: enable for debugging

        const { connection, lastDisconnect } = update;

// Connected
        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully!");
            
            // 👇 ഇത് പുതിയതായി ആഡ് ചെയ്യുക (Sub-bots ഓട്ടോമാറ്റിക് ആയി കണക്ട് ചെയ്യാൻ)
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

        // Reconnect
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log("🔄 Reconnecting...");
                startKira();
            } else {
                console.log("❌ Logged out. Delete session and scan again.");
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // ─── CALL REJECT ─────────────────────────────────────
    sock.ev.on("call", async (calls) => {
        if (!global.callReject) return;
        for (const call of calls) {
            if (call.status === "offer") {
                await sock.rejectCall(call.id, call.from);
                await sock.sendMessage(call.from, { text: "📵 Calls are not allowed. Please send a message." });
            }
        }
    });

    // ─── ANTI‑DELETE ─────────────────────────────────────
    sock.ev.on("messages.update", async (updates) => {
        try {
            for (const update of updates) {
                if (update.update?.message === null || update.update?.messageStubType) {
                    const key = update.key;
                    if (!key) continue;
                    const jid = key.remoteJid;
                    if (!global.antiDeleteChats.includes(jid)) continue;
                    const deletedMsg = global.messageStore[key.id];
                    if (!deletedMsg) continue;
                    const sender = deletedMsg.participant || deletedMsg.key?.participant || deletedMsg.key?.remoteJid;
                    await sock.sendMessage(global.ownerNumber, {
                        text: `🚨 DELETED MESSAGE\n\n👤 USER: ${sender}\n💬 CHAT: ${jid}`
                    });
                    await sock.sendMessage(global.ownerNumber, { forward: deletedMsg });
                }
            }
        } catch (err) {
            console.log("ANTI DELETE ERROR:", err);
        }
    });

    // ─── WELCOME / GOODBYE / ANTIFAKE / ANTIBOT ────────
    sock.ev.on("group-participants.update", async (update) => {
        console.log("👥 Group update:", JSON.stringify(update, null, 2));
        try {
            const jid = update.id;
            const action = update.action;
            for (const participant of update.participants) {
                const user = participant.id || participant;
                if ((action === "add" || action === "join") && global.welcomeChats.includes(jid)) {
                    await sock.sendMessage(jid, {
                        text: `🎉 Welcome @${user.split("@")[0]} to the group!`,
                        mentions: [user]
                    });
                }
                if ((action === "remove" || action === "leave") && global.goodbyeChats.includes(jid)) {
                    await sock.sendMessage(jid, {
                        text: `👋 Goodbye @${user.split("@")[0]}!`,
                        mentions: [user]
                    });
                }
                // ANTIFAKE
                if ((action === "add" || action === "join") && global.antiFakeChats?.includes(jid)) {
                    if (!user.startsWith("91")) {
                        await sock.groupParticipantsUpdate(jid, [user], "remove");
                    }
                }
                // ANTIBOT
                if ((action === "add" || action === "join") && global.antiBotChats?.includes(jid)) {
                    if (user.includes(":")) {
                        await sock.groupParticipantsUpdate(jid, [user], "remove");
                    }
                }
            }
        } catch (err) {
            console.log("WELCOME/GD ERROR:", err);
        }
    });
    

    // ─── MESSAGES.UPSERT (MAIN HANDLER) ─────────────────
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith("@g.us");
            const senderRaw = msg.key.fromMe ? sock.user.id : (msg.participant || jid);
            const sender = senderRaw.split(":")[0].split("@")[0] + "@s.whatsapp.net";
            const isOwner = sender === global.ownerNumber;
            
            // 👇 സ്യൂഡോ ഫയൽ വായിക്കാൻ നമ്മൾ പുതിയതായി ആഡ് ചെയ്ത കോഡ് 
            const fs = require('fs');
            const path = require('path');
            const sudoFile = path.join(process.cwd(), 'sudo.json');
            const dynamicSudoList = fs.existsSync(sudoFile) ? JSON.parse(fs.readFileSync(sudoFile)) : [];
            
            // .env-യിലുള്ള നമ്പറുകൾക്കും, നമ്മൾ കമാൻഡ് വഴി ആഡ് ചെയ്യുന്നവർക്കും പവർ കിട്ടും 🔥
            const isSudo = global.sudoUsers?.includes(sender) || dynamicSudoList.includes(sender);
            const isOwnerOrSudo = isOwner || isSudo;
            const text =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                "";

            // ── AUTO‑REACT ──
            if (global.autoReact && !msg.key.fromMe) {
                await sock.sendMessage(jid, { react: { text: "❤️", key: msg.key } });
            }
            
            // ── ANTILINK ──
            if (isGroup && global.antilinkChats.includes(jid) && text && !isOwner) {
                const linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
                if (linkRegex.test(text)) {
                    const metadata = await sock.groupMetadata(jid);
                    const member = metadata.participants.find(p => p.id === sender);
                    const isAdmin = member?.admin === "admin" || member?.admin === "superadmin";
                    if (!isAdmin) {
                        const mode = global.antilinkMode?.[jid] || "kick";
                        if (mode === "warn") {
                            await sock.sendMessage(jid, {
                                text: `⚠️ Link Detected\n\n@${sender.split("@")[0]}`,
                                mentions: [sender]
                            });
                            return;
                        }
                        if (mode === "delete") {
                            await sock.sendMessage(jid, { delete: msg.key });
                            return;
                        }
                        if (mode === "kick") {
                            await sock.sendMessage(jid, { delete: msg.key });
                            await sock.groupParticipantsUpdate(jid, [sender], "remove");
                            return;
                        }
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
                    
                    delete global.gameSessions[jid]; // കളി കഴിഞ്ഞാൽ സെഷൻ ക്ലിയർ ആക്കുന്നു
                    return; // ഇവിടെ 'return' കൊടുത്താൽ ബാക്കി കമാൻഡുകൾ ഒന്നും വർക്ക് ആകില്ല, കളി കറക്റ്റ് ആകും
                }
            }

            // ── BOT ONLINE CHECK ──
            if (
    !global.botOnline &&
    !isOwnerOrSudo
) return;

            // ── PRESENCE ──
            if (global.botOnline) {
                await sock.sendPresenceUpdate("available", jid);
            }

          // ── SETTINGS REPLY HANDLER ──
            const replyId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            
            // Sudo ഉള്ളവർക്കും സെറ്റിങ്സ് മാറ്റാൻ isOwnerOrSudo കൊടുത്തു
            if (replyId && global.settingsReplies[replyId] && isOwnerOrSudo) {
                const parts = text.toLowerCase().split(" ");
                const num = parts[0];
                const state = parts[1];
                if (!["on", "off"].includes(state)) return;
                const value = state === "on";
                
                switch (num) {
                    case "1": global.botMode = value ? "public" : "private"; break;
                    case "2": global.autoDlAllGroups = value; break;
                    case "3": global.autoDlAllDms = value; break;
                    case "4":
                        if (value) { if (!global.antiDeleteChats.includes(jid)) global.antiDeleteChats.push(jid); }
                        else { global.antiDeleteChats = global.antiDeleteChats.filter(x => x !== jid); }
                        break;
                    case "5":
                        if (value) { if (!global.welcomeChats.includes(jid)) global.welcomeChats.push(jid); }
                        else { global.welcomeChats = global.welcomeChats.filter(x => x !== jid); }
                        break;
                    case "6":
                        if (value) { if (!global.goodbyeChats.includes(jid)) global.goodbyeChats.push(jid); }
                        else { global.goodbyeChats = global.goodbyeChats.filter(x => x !== jid); }
                        break;
                    case "7":
                        if (value) { if (!global.antilinkChats.includes(jid)) global.antilinkChats.push(jid); }
                        else { global.antilinkChats = global.antilinkChats.filter(x => x !== jid); }
                        break;
                    case "8": global.callReject = value; break;
                    case "9": global.botOnline = value; break;
                    
                    // 👇 ഇവിടെയാണ് മിസ്സായ ആ 5 എണ്ണം ആഡ് ചെയ്തത്!
                    case "10": global.autoRead = value; break;
                    case "11": global.autoReact = value; break;
                    case "12": global.autoReply = value; break;
                    case "13": global.autoVV = value; break;
                    case "14": global.autoSticker = value; break;
                    
                    case "15": global.withoutHandler = value; break;
                    default: return;
                }
                return await sock.sendMessage(jid, {
                    text: `✅ Setting ${num} updated to *${state.toUpperCase()}*`
                }, { quoted: msg });
            }

            // ── AUTO‑DOWNLOAD ──
            const autoDlEnabled =
                global.autoDlChats.includes(jid) ||
                (global.autoDlAllGroups && isGroup) ||
                (global.autoDlAllDms && !isGroup);

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
    // .menu
    args = text.slice(prefix.length).trim().split(/ +/);
} else if (global.withoutHandler) {
    // menu
    args = text.trim().split(/ +/);
} else {
    return;
}


            const commandName = args.shift().toLowerCase();
            // ── .ME COMMAND (FUN / OWNER ONLY) ──
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
                if (global.botMode === "private" && !isOwnerOrSudo) return;
                if (command.category === "owner" && !isOwnerOrSudo) {
                    return await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg });
                }
                // Human-like random delay (6–12 seconds)
                const delay = Math.floor(Math.random() * 3000) + 4000;

                await new Promise(resolve => setTimeout(resolve, delay));

                // 🔥 SUDO BYPASS TRICK 🔥
                const originalOwner = global.ownerNumber;
                
                // കമാൻഡ് അയച്ചത് ഒരു Sudo ആണെങ്കിൽ, പ്ലഗിനെ പറ്റിച്ച് അവരെ മെയിൻ ഓണർ ആക്കുന്നു!
                if (isSudo) {
                    global.ownerNumber = sender; 
                }

                try {
                    await command.execute(sock, msg, args, isOwnerOrSudo);
                } catch (cmdErr) {
                    console.error("Command Execution Error:", cmdErr);
                } finally {
                    // കമാൻഡ് റൺ ചെയ്തുകഴിഞ്ഞാൽ ഉടനെ പഴയ ഒറിജിനൽ ഓണറെ തിരികെ വെക്കുന്നു
                    if (isSudo) {
                        global.ownerNumber = originalOwner; 
                    }
                }
            }
        } catch (err) {
            console.error("========== COMMAND ERROR ==========");
            console.error(err);
            console.error("===================================");
        }
    });
      // ─── ANTI-PROMOTE & ANTI-DEMOTE LISTENER ──────────
    const antiPromotePlugin = require('./plugins/antipromote.js');
    antiPromotePlugin.initAntiPromote(sock);

        // 👇 ഇത് പുതിയതായി ആഡ് ചെയ്യുക (Anti-fake വർക്ക് ചെയ്യാൻ)
    const groupManager = require('./plugins/group_manager.js');
    if (groupManager.initGroupEvents) {
        groupManager.initGroupEvents(sock);
    }

    // 🔥 നമ്മുടെ പുതിയ MENTION ME പ്ലഗിൻ ഇവിടെ കണക്ട് ചെയ്യുന്നു!
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