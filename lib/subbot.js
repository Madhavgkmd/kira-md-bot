// lib/subbot.js - KIRA X MD (AutoDL & Subbot Full Master Fix)
require("events").EventEmitter.defaultMaxListeners = 0;

const fs = require("fs");
const path = require("path");
const pino = require("pino");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestWaWebVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const { getSettings } = require("./database");

// ─────────────────────────────────────────────
// GLOBALS & HELPERS
// ─────────────────────────────────────────────

global.subBots = global.subBots || {};
global.subBotLocks = global.subBotLocks || {};
global.subBotStarting = global.subBotStarting || {};
global.subBotReconnectTimers = global.subBotReconnectTimers || {};
global.subBotGeneration = global.subBotGeneration || {};
global.messageStore = global.messageStore || {};

const SESSION_ROOT = path.join(process.cwd(), "subbot_sessions");
const SUDO_FILE = path.join(process.cwd(), "sudo.json");

const LOG = "[SUBBOT]";
const RECONNECT_DELAY = 5000;
const MESSAGE_STORE_LIMIT = 5000;
const MESSAGE_STORE_KEEP = 3500;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 🔥 Dynamic Bot Name Helper for Subbots
function getBotName() {
    return global.config?.BOT_NAME || process.env.BOT_NAME || "KIRA X MD";
}

function cleanNumber(number) {
    return String(number || "").replace(/[^0-9]/g, "");
}

function normalizeJid(jid) {
    if (!jid) return "";
    const number = String(jid).split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
    return number ? `${number}@s.whatsapp.net` : "";
}

function isGroupJid(jid) {
    return typeof jid === "string" && jid.endsWith("@g.us");
}

function getMessageText(message) {
    if (!message) return "";
    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.ephemeralMessage?.message?.conversation ||
        message.ephemeralMessage?.message?.extendedTextMessage?.text ||
        message.viewOnceMessage?.message?.conversation ||
        message.viewOnceMessage?.message?.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||
        ""
    );
}

function isReactionOrProtocol(message) {
    return !!(
        message?.reactionMessage ||
        message?.protocolMessage ||
        message?.ephemeralMessage?.message?.reactionMessage
    );
}

function getSessionPath(number) {
    return path.join(SESSION_ROOT, number);
}

function deleteSession(sessionPath) {
    try {
        if (!fs.existsSync(sessionPath)) return;
        fs.rmSync(sessionPath, { recursive: true, force: true });
    } catch (err) {
        console.error(`${LOG} Session delete error:`, err.message);
    }
}

function loadSudoUsers() {
    try {
        if (!fs.existsSync(SUDO_FILE)) return [];
        const data = JSON.parse(fs.readFileSync(SUDO_FILE, "utf8"));
        if (!Array.isArray(data)) return [];
        return data.map(x => normalizeJid(x)).filter(Boolean);
    } catch (err) {
        return [];
    }
}

function getCommand(name) {
    if (!global.commands || !Array.isArray(global.commands)) return null;
    const commandName = String(name || "").toLowerCase();
    return global.commands.find(cmd => {
        if (!cmd) return false;
        if (String(cmd.name || "").toLowerCase() === commandName) return true;
        if (Array.isArray(cmd.alias)) {
            return cmd.alias.some(alias => String(alias).toLowerCase() === commandName);
        }
        return false;
    });
}

function getMessageStoreKey(msg) {
    if (!msg?.key?.id) return "";
    return [msg.key.remoteJid || "", msg.key.id].join(":");
}

function storeMessage(msg) {
    try {
        const key = getMessageStoreKey(msg);
        if (!key) return;
        global.messageStore[key] = msg;
        const keys = Object.keys(global.messageStore);
        if (keys.length > MESSAGE_STORE_LIMIT) {
            const removeCount = keys.length - MESSAGE_STORE_KEEP;
            for (let i = 0; i < removeCount; i++) {
                delete global.messageStore[keys[i]];
            }
        }
    } catch {}
}

function getStoredMessage(key) {
    try {
        const storeKey = [key?.remoteJid || "", key?.id || ""].join(":");
        return global.messageStore?.[storeKey] || null;
    } catch {
        return null;
    }
}

function clearReconnectTimer(number) {
    try {
        const timer = global.subBotReconnectTimers[number];
        if (timer) {
            clearTimeout(timer);
            delete global.subBotReconnectTimers[number];
        }
    } catch {}
}

function scheduleReconnect(number) {
    const clean = cleanNumber(number);
    if (!clean || global.subBotReconnectTimers[clean] || global.subBots[clean]) return;

    console.log(`${LOG} Reconnecting +${clean} in ${RECONNECT_DELAY / 1000} seconds...`);

    global.subBotReconnectTimers[clean] = setTimeout(async () => {
        delete global.subBotReconnectTimers[clean];
        if (global.subBots[clean]) return;
        try {
            await startSubBot(clean);
        } catch (err) {
            console.error(`${LOG} Reconnect error +${clean}:`, err.message);
            if (!global.subBots[clean]) scheduleReconnect(clean);
        }
    }, RECONNECT_DELAY);
}

// ─────────────────────────────────────────────
// START SUBBOT
// ─────────────────────────────────────────────

async function startSubBot(phoneNumber, mainSock = null, requestJid = null, requestMsg = null) {
    const clean = cleanNumber(phoneNumber);

    if (!clean) {
        console.log(`${LOG} Invalid phone number.`);
        return null;
    }

    if (global.subBots[clean]) return global.subBots[clean];
    if (global.subBotStarting[clean]) return null;

    clearReconnectTimer(clean);
    global.subBotStarting[clean] = true;
    global.subBotGeneration[clean] = (global.subBotGeneration[clean] || 0) + 1;
    const generation = global.subBotGeneration[clean];
    const sessionPath = getSessionPath(clean);
    let subSock = null;

    try {
        if (!fs.existsSync(SESSION_ROOT)) fs.mkdirSync(SESSION_ROOT, { recursive: true });
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestWaWebVersion();

        console.log(`${LOG} Starting +${clean} using Baileys ${version.join(".")}`);

        const logger = pino({ level: "silent" });

        subSock = makeWASocket({
            version,
            logger,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            printQRInTerminal: false,
            browser: Browsers.macOS("Chrome"),
            markOnlineOnConnect: false,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 2000,
            maxMsgRetryCount: 5,
            getMessage: async key => {
                try {
                    const saved = getStoredMessage(key);
                    if (saved?.message) return saved.message;
                } catch {}
                return { conversation: "" };
            }
        });

        global.subBots[clean] = subSock;
        global.subBotStarting[clean] = false;
        global.subBotLocks[clean] = false;

        subSock.ev.on("creds.update", async creds => {
            try { await saveCreds(creds); } catch {}
        });

        let pairingRequested = false;

        subSock.ev.on("connection.update", async update => {
            try {
                const { connection, lastDisconnect, qr } = update;

                if (qr && !state.creds.registered && !pairingRequested && mainSock && requestJid) {
                    pairingRequested = true;
                    console.log(`${LOG} Requesting pairing code for +${clean}`);
                    
                    try {
                        await mainSock.sendMessage(requestJid, { text: `🔐 Requesting pairing code for +${clean}...` }, requestMsg ? { quoted: requestMsg } : {});
                    } catch {}

                    setTimeout(async () => {
                        try {
                            let code = await subSock.requestPairingCode(clean);
                            if (code) code = String(code).match(/.{1,4}/g)?.join("-") || code;
                            console.log(`${LOG} Pairing code for +${clean}: ${code}`);
                            try {
                                await mainSock.sendMessage(requestJid, { text: `🔑 Pairing code for +${clean}:\n\n${code}` });
                            } catch {}
                        } catch (err) {
                            console.error(`${LOG} Pairing error +${clean}:`, err.message);
                            pairingRequested = false;
                            try {
                                await mainSock.sendMessage(requestJid, { text: `❌ Pairing failed for +${clean}.\n\nPlease try again.` }, requestMsg ? { quoted: requestMsg } : {});
                            } catch {}
                        }
                    }, 1500);
                }

                if (connection === "open") {
                    if (global.subBotGeneration[clean] !== generation) return;
                    console.log(`${LOG} +${clean} connected successfully.`);
                    global.subBots[clean] = subSock;
                    global.subBotStarting[clean] = false;
                    global.subBotLocks[clean] = false;
                    clearReconnectTimer(clean);

                    if (mainSock && requestJid) {
                        try {
                            await mainSock.sendMessage(requestJid, { text: `✅ Subbot +${clean} connected successfully.` });
                        } catch {}
                    }
                    return;
                }

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;

                    console.log(`${LOG} +${clean} disconnected. Reason: ${statusCode || "unknown"}`);

                    if (global.subBots[clean] === subSock) delete global.subBots[clean];
                    global.subBotStarting[clean] = false;
                    global.subBotLocks[clean] = false;

                    if (loggedOut) {
                        console.log(`${LOG} +${clean} logged out. Removing session.`);
                        clearReconnectTimer(clean);
                        deleteSession(sessionPath);
                        if (mainSock && requestJid) {
                            try { await mainSock.sendMessage(requestJid, { text: `🚪 Subbot +${clean} logged out.` }); } catch {}
                        }
                        return;
                    }

                    if (global.subBotGeneration[clean] !== generation) return;
                    scheduleReconnect(clean);
                }
            } catch (err) {
                console.error(`${LOG} Connection handler error:`, err.message);
            }
        });

        subSock.ev.on("call", async calls => {
            try {
                const config = getSettings(clean);
                if (!config?.callReject) return;
                for (const call of calls || []) {
                    if (call.status !== "offer") continue;
                    try {
                        await subSock.rejectCall(call.id, call.from);
                        await subSock.sendMessage(call.from, { text: "📵 Calls are not allowed on this bot." });
                    } catch {}
                }
            } catch {}
        });

        subSock.ev.on("messages.upsert", async ({ messages, type }) => {
            try {
                if (type === 'append') return;
                if (!Array.isArray(messages) || !messages.length) return;
                for (const subMsg of messages) {
                    try {
                        await handleSubMessage(subSock, subMsg, clean, type);
                    } catch {}
                }
            } catch {}
        });

        return subSock;

    } catch (err) {
        console.error(`${LOG} Failed to start +${clean}:`, err.message);
        global.subBotStarting[clean] = false;
        global.subBotLocks[clean] = false;
        if (global.subBots[clean] === subSock) delete global.subBots[clean];
        if (subSock && global.subBotGeneration[clean] === global.subBotGeneration[clean]) scheduleReconnect(clean);
        return null;
    }
}

// ─────────────────────────────────────────────
// AUTO DOWNLOAD HANDLER
// ─────────────────────────────────────────────

async function handleAutoDownload(sock, msg, text, isSubOwner) {
    try {
        if (/instagram\.com/i.test(text)) {
            const command = getCommand("insta");
            if (command && typeof command.execute === "function") {
                await command.execute(sock, msg, [text], isSubOwner);
                return true;
            }
        }

        if (/facebook\.com|fb\.watch|fb\.gg/i.test(text)) {
            const command = getCommand("fb");
            if (command && typeof command.execute === "function") {
                await command.execute(sock, msg, [text], isSubOwner);
                return true;
            }
        }

        if (/youtube\.com|youtu\.be/i.test(text)) {
            const command = getCommand("ytv");
            if (command && typeof command.execute === "function") {
                await command.execute(sock, msg, [text], isSubOwner);
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error(`${LOG} AutoDL execution error:`, err.message);
        return false;
    }
}

// ─────────────────────────────────────────────
// ANTILINK HANDLER
// ─────────────────────────────────────────────

async function handleAntiLink(sock, msg, jid, sender, config) {
    try {
        const metadata = await sock.groupMetadata(jid);
        const realSender = msg.key.participant || msg.participant || sender;
        const member = metadata.participants.find(p => p.id === realSender || normalizeJid(p.id) === sender || p.id?.split("@")[0] === sender.split("@")[0]);
        const isAdmin = member?.admin === "admin" || member?.admin === "superadmin";

        if (isAdmin) return false;

        const mode = config.antilinkMode?.[jid] || "delete";

        try {
            await sock.sendMessage(jid, { delete: msg.key });
        } catch {}

        if (mode === "warn") {
            await sock.sendMessage(jid, {
                text: `⚠️ @${sender.split("@")[0]}, WhatsApp group links are not allowed here.`,
                mentions: [sender]
            });
            return true;
        }

        if (mode === "kick") {
            await sock.sendMessage(jid, {
                text: `🚫 @${sender.split("@")[0]} sent a group link. Removing...`,
                mentions: [sender]
            });
            setTimeout(async () => {
                try {
                    await sock.groupParticipantsUpdate(jid, [member?.id || realSender], "remove");
                } catch {}
            }, 1200);
            return true;
        }
        return true;
    } catch (err) {
        return false;
    }
}

// ─────────────────────────────────────────────
// MESSAGE PROCESSOR
// ─────────────────────────────────────────────

async function handleSubMessage(sock, msg, cleanNumber, type) {
    try {
        if (type === 'append') return;
        if (!msg?.message || !msg.key?.remoteJid) return;
        if (isReactionOrProtocol(msg.message)) return;

        if (msg.messageTimestamp) {
            const currentTime = Math.floor(Date.now() / 1000);
            const msgTime = Number(msg.messageTimestamp);
            if (currentTime - msgTime > 30) return; 
        }

        storeMessage(msg);
        const jid = msg.key.remoteJid;
        const config = getSettings(cleanNumber) || {};

        if (jid === "status@broadcast") {
            if (config?.autoStatusView) {
                try { await sock.readMessages([msg.key]); } catch {}
            }
            return;
        }

        const text = getMessageText(msg.message).trim();
        const prefix = process.env.PREFIX || ".";
        if (!text) return;
        if (msg.key.fromMe && !text.startsWith(prefix)) return;

        const isGroup = isGroupJid(jid);
        const senderRaw = msg.key.fromMe ? sock.user?.id : (msg.key.participant || msg.participant || jid);
        const sender = normalizeJid(senderRaw);
        const subOwner = `${cleanNumber}@s.whatsapp.net`;
        const globalOwner = normalizeJid(global.ownerNumber);
        const sudoUsers = loadSudoUsers();
        const isSudo = !!(global.sudoUsers?.includes(sender) || sudoUsers.includes(sender));
        const isSubOwner = sender === subOwner || sender === globalOwner || isSudo;

        const currentMode = config.botMode || "public";
        if (currentMode === "private" && !isSubOwner) return;

        if (config.autoRead && !msg.key.fromMe) {
            sock.readMessages([msg.key]).catch(() => {});
        }

        if (config.autoReact && !msg.key.fromMe && msg.key.id && !msg.key.id.startsWith("BAE5")) {
            const emojis = ["❤️", "🔥", "😂", "👍", "✨", "💯", "🎉", "😎"];
            sock.sendMessage(jid, { react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key } }).catch(() => {});
        }

        if (isGroup && config.antilinkChats?.includes(jid) && !isSubOwner) {
            const linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
            if (linkRegex.test(text)) {
                const handled = await handleAntiLink(sock, msg, jid, sender, config);
                if (handled) return;
            }
        }

        const autoDlEnabled =
            config.autoDlChats?.includes(jid) ||
            (config.autoDlAllGroups && isGroup) ||
            (config.autoDlAllDms && !isGroup);

        if (autoDlEnabled && !text.startsWith(prefix)) {
            const handled = await handleAutoDownload(sock, msg, text, isSubOwner);
            if (handled) return;
        }

        const hasPrefix = text.startsWith(prefix);
        if (!hasPrefix && !config.withoutHandler) return;

        const commandText = hasPrefix ? text.slice(prefix.length).trim() : text.trim();
        if (!commandText) return;

        const args = commandText.split(/\s+/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const command = getCommand(commandName);
        if (!command) return;

        if (command.category === "owner" && !isSubOwner) {
            await sock.sendMessage(jid, { text: "❌ Owner only!" }, { quoted: msg });
            return;
        }

        if (typeof command.execute !== "function") return;
        try {
            await command.execute(sock, msg, args, isSubOwner);
        } catch {}
    } catch {}
}

async function loadAllSubBots() {
    try {
        if (!fs.existsSync(SESSION_ROOT)) return;
        const folders = fs.readdirSync(SESSION_ROOT, { withFileTypes: true });
        const numbers = folders.filter(e => e.isDirectory()).map(e => cleanNumber(e.name)).filter(Boolean);
        if (!numbers.length) return;

        console.log(`${LOG} Loading ${numbers.length} saved subbot(s)...`);
        for (const number of numbers) {
            const sessionPath = getSessionPath(number);
            if (!fs.existsSync(path.join(sessionPath, "creds.json"))) continue;
            try { await startSubBot(number); } catch {}
            await sleep(700);
        }
    } catch {}
}

module.exports = { startSubBot, loadAllSubBots };