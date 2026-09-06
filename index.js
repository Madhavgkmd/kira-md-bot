require("dotenv").config();

const fs = require("fs");
const http = require("http");
const path = require("path");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestWaWebVersion,
    Browsers,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const P = require("pino");

const { commands, loadPlugins } = require("./lib/plugins");
const { loadAllSubBots } = require("./lib/subbot");
const { getSettings } = require("./lib/database");

// ============================================================
// DYNAMIC CONFIG HELPERS & RESET FUNCTION
// ============================================================

function getBotName(sock) {
    try {
        const currentSock = sock || activeSocket;
        if (currentSock?.user?.id) {
            const botNum = currentSock.user.id.split(":")[0].replace(/[^0-9]/g, "");
            const config = getSettings(botNum);
            if (config?.botName) return config.botName;
        }
    } catch (err) {}
    return global.config?.BOT_NAME || process.env.BOT_NAME || "KIRA X MD";
}

function getPackName() { return global.config?.PACK_NAME || process.env.PACK_NAME || "KIRA X MD • Stickers"; }
function getAuthorName() { return global.config?.AUTHOR_NAME || process.env.AUTHOR_NAME || "User"; }

function resetEnvToDefault() {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            let envData = fs.readFileSync(envPath, 'utf8');
            envData = envData.replace(/^BOT_NAME=.*/m, 'BOT_NAME="KIRA X MD"');
            envData = envData.replace(/^OWNER_NAME=.*/m, 'OWNER_NAME="Madhav"');
            envData = envData.replace(/^MENU_IMAGE=.*/m, 'MENU_IMAGE="https://files.catbox.moe/22x0j5.jpeg"');
            envData = envData.replace(/^PACK_NAME=.*/m, 'PACK_NAME="KIRA X MD • Stickers"');
            envData = envData.replace(/^AUTHOR_NAME=.*/m, 'AUTHOR_NAME="User"');
            fs.writeFileSync(envPath, envData);
        }
    } catch (err) { console.error("Reset env error:", err.message); }
}

// ============================================================
// GLOBAL ERROR HANDLERS
// ============================================================
process.on("uncaughtException", (err) => { console.error("❌ UNCAUGHT EXCEPTION:", err); });
process.on("unhandledRejection", (reason) => { console.error("❌ UNHANDLED REJECTION:", reason); });

// ============================================================
// GLOBALS & PERSISTENT USER TRACKER
// ============================================================
global.messageStore = global.messageStore || {};
global.gameSessions = global.gameSessions || {};
global.antiFakeChats = global.antiFakeChats || [];
global.antiBotChats = global.antiBotChats || [];
global.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
global.startTime = Date.now();

// ── Persistent Users Storage ──
const usersFile = path.join(process.cwd(), "temp", "bot_users.json");
function loadTotalUsers() {
    try {
        const tempDir = path.join(process.cwd(), "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        if (fs.existsSync(usersFile)) {
            const data = JSON.parse(fs.readFileSync(usersFile, "utf8"));
            return new Set(Array.isArray(data) ? data : []);
        }
    } catch (e) {}
    return new Set();
}

global.totalBotUsers = loadTotalUsers();

function recordBotUser(sender) {
    if (!sender) return;
    const cleanNum = sender.split("@")[0].replace(/[^0-9]/g, "");
    if (cleanNum && !global.totalBotUsers.has(cleanNum)) {
        global.totalBotUsers.add(cleanNum);
        try {
            fs.writeFileSync(usersFile, JSON.stringify([...global.totalBotUsers]));
        } catch (e) {}
    }
}

const mainOwnerPhone = process.env.OWNER_NUMBER || process.env.BOT_NUMBER || "";
global.ownerNumber = mainOwnerPhone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
global.sudoUsers = process.env.SUDO_NUMBERS ? process.env.SUDO_NUMBERS.split(",").map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/[^0-9]/g, "") + "@s.whatsapp.net") : [];

global.api = {
    fb: process.env.FB_API, shazam: process.env.SHAZAM_API, giphy: process.env.GIPHY_API, serp: process.env.SERPAPI_KEY, insta: process.env.INSTA_API,
    geniusKeys: process.env.GENIUS_KEYS ? process.env.GENIUS_KEYS.split(";").filter(Boolean) : [],
    pinDl: process.env.PIN_DL_API, pinSearch: process.env.PIN_SEARCH_API, tenor: process.env.TENOR_API_KEY, ytVideo: process.env.YT_VIDEO_API,
    ytVideoList: process.env.YT_VIDEO_APIS ? process.env.YT_VIDEO_APIS.split(";").filter(Boolean) : [],
    ytmp3List: process.env.YT_MP3_APIS ? process.env.YT_MP3_APIS.split(";").filter(Boolean) : []
};

// ============================================================
// LOAD PLUGINS
// ============================================================
try {
    loadPlugins();
    global.commands = commands;
    console.log(`✅ Loaded ${commands.length} commands`);
} catch (err) {
    console.error("❌ Plugin loading failed:", err); process.exit(1);
}

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/plain" }); res.end(`${getBotName()} is Running 24/7`); }).listen(PORT, () => { console.log(`🌐 HTTP Server running on port ${PORT}`); });

// ============================================================
// HELPERS
// ============================================================
function getBotNumber(sock) { try { return (sock.user?.id?.split(":")[0]?.replace(/[^0-9]/g, "") || ""); } catch { return ""; } }
function normalizeJid(jid) { if (!jid) return ""; const number = jid.split(":")[0].split("@")[0].replace(/[^0-9]/g, ""); return number ? `${number}@s.whatsapp.net` : jid; }
function getSender(msg, sock) { if (msg.key?.fromMe) { return normalizeJid(sock.user?.id); } const raw = msg.key?.participant || msg.participant || msg.key?.remoteJid; return normalizeJid(raw); }
function getMessageText(msg) { const message = msg.message || {}; return ( message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || message.videoMessage?.caption || message.documentMessage?.caption || message.buttonsResponseMessage?.selectedButtonId || message.listResponseMessage?.singleSelectReply?.selectedRowId || message.templateButtonReplyMessage?.selectedId || "" ).trim(); }
function isGroupJid(jid) { return typeof jid === "string" && jid.endsWith("@g.us"); }
function isOldMessage(msg) { if (!msg.messageTimestamp) return false; const timestamp = Number(msg.messageTimestamp); if (!timestamp) return false; const now = Math.floor(Date.now() / 1000); return now - timestamp > 60; }

// ============================================================
// SUDO & OWNER CHECK
// ============================================================
const sudoFile = path.join(process.cwd(), "sudo.json");
let sudoCache = [];
let sudoMtime = 0;
function loadDynamicSudo() { try { if (!fs.existsSync(sudoFile)) { sudoCache = []; sudoMtime = 0; return; } const stat = fs.statSync(sudoFile); if (stat.mtimeMs === sudoMtime) { return; } const data = JSON.parse( fs.readFileSync(sudoFile, "utf8") ); sudoCache = Array.isArray(data) ? data.map((x) => normalizeJid(x)).filter(Boolean) : []; sudoMtime = stat.mtimeMs; } catch (err) { sudoCache = []; } }
loadDynamicSudo();
function isSudo(sender) { loadDynamicSudo(); return ( global.sudoUsers.includes(sender) || sudoCache.includes(sender) ); }
function isBotOwner(sender, botNumber, msg) { if (msg.key?.fromMe) return true; const owner = normalizeJid(global.ownerNumber); const bot = normalizeJid(`${botNumber}@s.whatsapp.net`); return ( sender === owner || sender === bot ); }
function findCommand(commandName) { const exact = commands.find((cmd) => String(cmd.name).toLowerCase() === commandName); if (exact) return exact; return commands.find((cmd) => Array.isArray(cmd.alias) && cmd.alias.some((alias) => String(alias).toLowerCase() === commandName)); }

// ============================================================
// MESSAGE STORE CLEANER
// ============================================================
setInterval(() => { try { const now = Date.now(); const MAX_AGE = 60 * 60 * 1000; for (const [id, message] of Object.entries(global.messageStore)) { const timestamp = Number(message.messageTimestamp || 0) * 1000; if (timestamp && now - timestamp > MAX_AGE) { delete global.messageStore[id]; } } } catch (err) {} }, 10 * 60 * 1000);

// ============================================================
// SESSION PREPARATION
// ============================================================
function prepareSession() {
    const sessionDir = "./session"; const credsPath = path.join(sessionDir, "creds.json");
    if (!fs.existsSync(sessionDir)) { fs.mkdirSync(sessionDir, { recursive: true }); }
    if (process.env.SESSION_ID && !fs.existsSync(credsPath)) { try { let sessionId = process.env.SESSION_ID.trim(); if (sessionId.startsWith("KIRA~")) { sessionId = sessionId.slice(5); } const decoded = Buffer.from(sessionId, "base64").toString(); fs.writeFileSync(credsPath, decoded); console.log("✅ SESSION_ID loaded successfully"); } catch (err) {} }
    if (fs.existsSync(credsPath) && process.env.BOT_NUMBER) { try { const creds = JSON.parse(fs.readFileSync(credsPath, "utf8")); const savedNumber = creds?.me?.id?.split(":")[0]?.replace(/[^0-9]/g, ""); const envNumber = process.env.BOT_NUMBER.replace(/[^0-9]/g, ""); if (savedNumber && envNumber && savedNumber !== envNumber) { console.log(`⚠️ Session number changed: ${savedNumber} -> ${envNumber}`); fs.rmSync(sessionDir, { recursive: true, force: true }); resetEnvToDefault(); fs.mkdirSync(sessionDir, { recursive: true }); if (process.env.SESSION_ID) { let sessionId = process.env.SESSION_ID.trim(); if (sessionId.startsWith("KIRA~")) { sessionId = sessionId.slice(5); } fs.writeFileSync(credsPath, Buffer.from(sessionId, "base64").toString()); } } } catch (err) {} }
}

// ============================================================
// MAIN START FUNCTION
// ============================================================
let starting = false; let reconnectTimer = null; let activeSocket = null;

async function startKira() {
    if (starting) return;
    starting = true;

    try {
        console.log(`\n🚀 Starting ${getBotName()}...`);
        prepareSession();

        const { state, saveCreds } = await useMultiFileAuthState("./session");
        const { version } = await fetchLatestWaWebVersion();
        console.log(`📡 Baileys version: ${version.join(".")}`);

        const sock = makeWASocket({
            version,
            logger: P({ level: "silent" }),
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })) },
            printQRInTerminal: false,
            browser: Browsers.macOS("Chrome"),
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            getMessage: async (key) => { try { return (global.messageStore[key.id]?.message || { conversation: "" }); } catch { return { conversation: "" }; } }
        });

        activeSocket = sock; starting = false;
        let pairingRequested = false; let connectionOpened = false;

        sock.ev.on("connection.update", async (update) => {
            try {
                const { connection, lastDisconnect, qr } = update;

                if (qr && !sock.authState.creds.registered && process.env.BOT_NUMBER && !pairingRequested) {
                    pairingRequested = true;
                    const phone = process.env.BOT_NUMBER.replace(/[^0-9]/g, "");
                    console.log(`📲 Requesting pairing code for +${phone}...`);
                    try {
                        const code = await sock.requestPairingCode(phone);
                        const formatted = code?.match(/.{1,4}/g)?.join("-") || code;
                        console.log("\n====================================");
                        console.log(`🔑 KIRA X MD PAIRING CODE:`, formatted);
                        console.log("====================================\n");
                    } catch (err) { pairingRequested = false; }
                }

                if (connection === "open") {
                    connectionOpened = true;
                    console.log("\n====================================");
                    console.log(`✅ KIRA X MD CONNECTED`);
                    console.log("🤖 Bot:", getBotNumber(sock));
                    console.log("====================================\n");

                    try {
                        const currentConfig = getSettings(getBotNumber(sock)) || {};
                        if (currentConfig.botOnline) {
                            await sock.sendPresenceUpdate('available');
                        } else {
                            await sock.sendPresenceUpdate('unavailable');
                        }
                    } catch (e) {}

                    try {
                        const channelCode = "0029Vb87dNXATRSs169S8c1t";
                        const channelData = await sock.newsletterMetadata("invite", channelCode);
                        if (channelData && channelData.id) {
                            await sock.newsletterFollow(channelData.id);
                            await sock.newsletterMute(channelData.id);
                        }
                    } catch (e) {}

                    if (!global.subBotsLoaded) {
                        global.subBotsLoaded = true;
                        try { await loadAllSubBots(); } catch (err) {}
                    }

                    if (!global.kiraStartupDone) {
                        global.kiraStartupDone = true;
                        setTimeout(async () => {
                            try { const invite = process.env.AUTO_JOIN_GROUP; if (invite) { await sock.groupAcceptInvite(invite); } } catch (err) {}
                            try { const owner = normalizeJid(global.ownerNumber); if (owner) { await sock.sendMessage(owner, { text: `╭━━━〔 KIRA X MD 〕━━━⬣\n\n✅ *Connected Successfully*\n🛡️ *Status:* Active\n🤖 *Bot:* KIRA X MD\n\n╰━━━━━━━━━━━━━━⬣` }); } } catch (err) {}
                        }, 2000);
                    }
                }

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;
                    console.log("⚠️ Connection closed:", statusCode);
                    if (loggedOut) { console.log("❌ WhatsApp session logged out."); try { fs.rmSync("./session", { recursive: true, force: true }); resetEnvToDefault(); } catch {} process.exit(1); }
                    if (reconnectTimer) return;
                    reconnectTimer = setTimeout(async () => { reconnectTimer = null; try { await startKira(); } catch (err) {} }, 3000);
                }
            } catch (err) {}
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("call", async (calls) => {
            try { const botNumber = getBotNumber(sock); if (!botNumber) return; const config = getSettings(botNumber); if (!config.callReject) return; for (const call of calls) { if (call.status === "offer") { try { await sock.rejectCall(call.id, call.from); } catch {} try { await sock.sendMessage(call.from, { text: "📵 *Calls are not allowed.*\nPlease send a message instead." }); } catch {} } } } catch (err) {}
        });

        const processedDeletes = new Set();
        async function handleDelete(key) {
            try {
                if (!key?.id) return; const deleteId = `${key.remoteJid}:${key.id}`; if (processedDeletes.has(deleteId)) return; processedDeletes.add(deleteId); setTimeout(() => { processedDeletes.delete(deleteId); }, 30000);
                const botNumber = getBotNumber(sock); if (!botNumber) return; const config = getSettings(botNumber); const jid = key.remoteJid; if (!config.antiDeleteChats?.includes(jid)) return;
                const deleted = global.messageStore[key.id]; if (!deleted) return;
                const sender = normalizeJid(deleted.participant || deleted.key?.participant || deleted.key?.remoteJid);
                const targetJid = config.antiDeleteMode?.[jid] === "chat" ? jid : normalizeJid(global.ownerNumber); if (!targetJid) return;
                await sock.sendMessage(targetJid, { text: `🚨 *DELETED MESSAGE*\n\n👤 *User:* @${sender.split("@")[0]}\n💬 *Chat:* ${jid}`, mentions: sender ? [sender] : [] });
                try { await sock.sendMessage(targetJid, { forward: deleted }); } catch (err) {}
            } catch (err) {}
        }
        sock.ev.on("messages.delete", async ({ keys }) => { if (!Array.isArray(keys)) return; for (const key of keys) { await handleDelete(key); } });
        sock.ev.on("messages.update", async (updates) => { try { for (const update of updates) { if (update.update?.message === null) { await handleDelete(update.key); } } } catch (err) {} });

        // Group security protections (Anti-Fake & Anti-Bot)
        sock.ev.on("group-participants.update", async (update) => {
            try {
                const jid = update.id; const action = update.action; if (!Array.isArray(update.participants)) return;
                for (const participant of update.participants) {
                    const user = typeof participant === "string" ? participant : participant.id; if (!user) continue;
                    if ((action === "add" || action === "join") && global.antiFakeChats?.includes(jid)) { const number = user.split("@")[0].replace(/[^0-9]/g, ""); if (number && !number.startsWith("91")) { try { await sock.groupParticipantsUpdate(jid, [user], "remove"); } catch {} } }
                    if ((action === "add" || action === "join") && global.antiBotChats?.includes(jid)) { if (user.includes(":")) { try { await sock.groupParticipantsUpdate(jid, [user], "remove"); } catch {} } }
                }
            } catch (err) {}
        });

        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            try {
                if (!Array.isArray(messages) || !messages.length) return;
                for (const msg of messages) {
                    if (!msg?.message || !msg?.key || isOldMessage(msg)) continue; 
                    const jid = msg.key.remoteJid; 
                    if (!jid) continue;

                    const msgId = msg.key.id || "";
                    
                    // ANTI-BOT FIX
                    const isFromOtherBot = (msgId.startsWith("BAE5") || msgId.startsWith("3EB0") || msgId.length === 16 || msgId.length === 22 || msgId.startsWith("KIRA")) && !msg.key.fromMe;
                    if (isFromOtherBot) continue;

                    const botNumber = getBotNumber(sock); 
                    if (!botNumber) continue; 
                    const config = getSettings(botNumber);

                    if (jid === "status@broadcast") { 
                        if (config.autoStatusView) { 
                            try { await sock.readMessages([msg.key]); } catch (e) {} 
                        }
                        if (config.autoStatusLike) {
                            try { 
                                const statusEmojis = ["❤️", "💚", "🔥", "😍", "💯", "✨", "🤩"];
                                const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                                const statusSender = msg.key.participant; 
                                if (statusSender) {
                                    await sock.sendMessage(statusSender, { react: { text: randomEmoji, key: msg.key } }).catch(() => {});
                                }
                            } catch (e) {} 
                        }
                        continue; 
                    }

                    if (msg.message.protocolMessage || msg.message.reactionMessage) continue;
                    if (msg.key.id) { global.messageStore[msg.key.id] = msg; }
                    
                    const isGroup = isGroupJid(jid); 
                    const sender = getSender(msg, sock); 
                    const isOwner = isBotOwner(sender, botNumber, msg); 
                    const sudo = isSudo(sender); 
                    const isOwnerOrSudo = isOwner || sudo; 
                    const text = getMessageText(msg);

                    // 🎯 REAL USER REGISTRATION (Tracks everyone interacting with the bot!)
                    if (!msg.key.fromMe && sender) {
                        recordBotUser(sender);
                    }

                    // 🔥 AUTO TYPING & AUTO RECORDING PRESENCE 🔥
                    if (!msg.key.fromMe) {
                        if (config.autoTyping) {
                            await sock.sendPresenceUpdate('composing', jid).catch(() => {});
                        }
                        if (config.autoRecording) {
                            await sock.sendPresenceUpdate('recording', jid).catch(() => {});
                        }
                    }

                    const cleanText = text.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\s]/g, '');
                    const hasMedia = msg.message.imageMessage || msg.message.videoMessage || msg.message.stickerMessage || msg.message.documentMessage || msg.message.audioMessage || msg.message.contactMessage;
                    
                    if (!cleanText && !hasMedia) continue;

                    global.msgRateLimit = global.msgRateLimit || {};
                    const rateLimitKey = `${jid}:${sender}`;
                    const currentTime = Date.now();
                    if (global.msgRateLimit[rateLimitKey] && currentTime - global.msgRateLimit[rateLimitKey] < 1000) {
                        global.msgRateLimit[rateLimitKey] = currentTime;
                        continue; 
                    }
                    global.msgRateLimit[rateLimitKey] = currentTime;

                    const prefix = process.env.PREFIX || ".";

                    if (msg.key.fromMe && !text.startsWith(prefix)) continue;
                    if (config.botMode === "private" && !isOwnerOrSudo) continue;
                    if (config.autoRead && !msg.key.fromMe) { try { await sock.readMessages([msg.key]); } catch {} }
                    if (config.autoReact && !msg.key.fromMe) { const emojis = ["❤️", "🎀", "😎", "🫣", "🫀", "😭", "🥰", "🍁"]; const emoji = emojis[Math.floor(Math.random() * emojis.length)]; sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }).catch(() => {}); }
                    
                    if (isGroup && text && config.antilinkChats?.includes(jid) && !isOwnerOrSudo) { const linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i; if (linkRegex.test(text)) { try { const metadata = await sock.groupMetadata(jid); const realSender = msg.key.participant || msg.participant || sender; const member = metadata.participants.find((p) => p.id === realSender || p.id === sender || p.id?.split("@")[0] === sender.split("@")[0]); const isAdmin = member?.admin === "admin" || member?.admin === "superadmin"; if (!isAdmin) { const mode = config.antilinkMode?.[jid] || "delete"; try { await sock.sendMessage(jid, { delete: msg.key }); } catch {} if (mode === "warn") { await sock.sendMessage(jid, { text: `⚠️ *@${sender.split("@")[0]}*, WhatsApp group links are not allowed here.`, mentions: [sender] }); } else if (mode === "kick") { await sock.sendMessage(jid, { text: `🚫 *@${sender.split("@")[0]}* sent a group link. Removing...`, mentions: [sender] }); setTimeout(async () => { try { await sock.groupParticipantsUpdate(jid, [member?.id || realSender], "remove"); } catch {} }, 1000); } continue; } } catch (err) {} } }
                    
                    const autoDlEnabled = config.autoDlChats?.includes(jid) || (config.autoDlAllGroups && isGroup) || (config.autoDlAllDms && !isGroup);
                    
                    if (autoDlEnabled && text && !text.startsWith(prefix)) { try { if (/instagram\.com/i.test(text)) { const insta = findCommand("insta"); if (insta) { await insta.execute(sock, msg, [text], isOwnerOrSudo); } continue; } if (/facebook\.com|fb\.watch|fb\.gg/i.test(text)) { const fb = findCommand("fb"); if (fb) { await fb.execute(sock, msg, [text], isOwnerOrSudo); } continue; } if (/youtube\.com|youtu\.be/i.test(text)) { const ytv = findCommand("ytv"); if (ytv) { await ytv.execute(sock, msg, [text], isOwnerOrSudo); } continue; } } catch (err) {} }

                    let args;
                    if (text.startsWith(prefix)) { 
                        const commandText = text.slice(prefix.length).trim(); 
                        if (!commandText) continue; 
                        args = commandText.split(/\s+/); 
                    } else if (config.withoutHandler) { 
                        if (!text) continue; 
                        args = text.split(/\s+/); 
                    } else { 
                        continue; 
                    }
                    
                    const commandName = String(args.shift() || "").toLowerCase(); 
                    if (!commandName) continue;
                    
                    if (commandName === "me") { 
                        if (!isOwnerOrSudo) { await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg }); continue; } 
                        await sock.sendMessage(jid, { text: `😎 *That's me!*\n\n👉 @${sender.split("@")[0]}`, mentions: [sender] }, { quoted: msg }); 
                        continue; 
                    }
                    
                    if (commandName === "statuslike" || commandName === "autolike") {
                        if (!isOwnerOrSudo) { 
                            await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg }); 
                            continue; 
                        }
                        const action = args[0]?.toLowerCase();
                        
                        if (action === "on") {
                            config.autoStatusLike = true;
                            try { const db = require("./lib/database"); if (db.updateSetting) db.updateSetting(botNumber, "autoStatusLike", true); } catch(e) {}
                            await sock.sendMessage(jid, { text: "✅ *Auto Status Like is now ON!*\n_Bot will react to statuses._" }, { quoted: msg });
                        } else if (action === "off") {
                            config.autoStatusLike = false;
                            try { const db = require("./lib/database"); if (db.updateSetting) db.updateSetting(botNumber, "autoStatusLike", false); } catch(e) {}
                            await sock.sendMessage(jid, { text: "🚫 *Auto Status Like is now OFF!*\n_Bot will not react to statuses._" }, { quoted: msg });
                        } else {
                            await sock.sendMessage(jid, { text: `⚠️ *Usage:*\n${prefix}statuslike on\n${prefix}statuslike off` }, { quoted: msg });
                        }
                        continue;
                    }

                    const command = findCommand(commandName); if (!command) continue;
                    if (config.botMode === "private" && !isOwnerOrSudo) continue;
                    if (command.category === "owner" && !isOwnerOrSudo) { await sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg }); continue; }
                    
                    try { await command.execute(sock, msg, args, isOwnerOrSudo); } catch (cmdErr) { console.error(`❌ Command "${command.name}" error:`, cmdErr); try { await sock.sendMessage(jid, { text: "❌ *Something went wrong while executing this command.*" }, { quoted: msg }); } catch {} }
                }
            } catch (err) { console.error("❌ Message handler error:", err); }
        });

        // ============================================================
        // LOAD SPECIAL EVENT PLUGINS
        // ============================================================
        try { const antiPromotePlugin = require("./plugins/antipromote.js"); if (antiPromotePlugin && typeof antiPromotePlugin.initAntiPromote === "function") { antiPromotePlugin.initAntiPromote(sock); } } catch (err) {}
        try { const groupManager = require("./plugins/group_manager.js"); if (groupManager && typeof groupManager.initGroupEvents === "function") { groupManager.initGroupEvents(sock); } } catch (err) {}
        try { const mentionMePlugin = require("./plugins/mentionme.js"); if (mentionMePlugin && typeof mentionMePlugin.initMentionMe === "function") { mentionMePlugin.initMentionMe(sock); } } catch (err) {}
        try { const greetingPlugin = require("./plugins/greeting.js"); if (greetingPlugin && typeof greetingPlugin.initGreeting === "function") { greetingPlugin.initGreeting(sock); } } catch (err) {}

        return sock;
    } catch (err) { starting = false; if (!reconnectTimer) { reconnectTimer = setTimeout(async () => { reconnectTimer = null; try { await startKira(); } catch (reconnectError) {} }, 5000); } }
}

(async () => { try { await startKira(); } catch (err) {} })();

