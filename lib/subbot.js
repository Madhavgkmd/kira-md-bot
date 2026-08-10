// lib/jadibot.js – KIRA X MD (Unbreakable & Fully Isolated Pair Bot)
require('events').EventEmitter.defaultMaxListeners = 0;

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { getSettings } = require("./database");

global.subBots = global.subBots || {};
global.subBotLocks = global.subBotLocks || {};

function deleteSession(sessionPath) {
    try {
        if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
    } catch (e) {}
}

async function startSubBot(phoneNumber, mainSock = null, jid = null, msg = null) {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

    if (global.subBotLocks[cleanNumber]) return;
    global.subBotLocks[cleanNumber] = true;

    const sessionPath = path.join(process.cwd(), `subbot_sessions/${cleanNumber}`);
    const isNewSession = !fs.existsSync(sessionPath);
    
    try {
        if (isNewSession) fs.mkdirSync(sessionPath, { recursive: true });
    } catch (e) {}

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const randomBrowserVersion = `12${Math.floor(Math.random() * 8)}.0.${Math.floor(Math.random() * 5000)}.${Math.floor(Math.random() * 100)}`;

    const subSock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), // ലോഗുകൾ വന്ന് ക്രാഷ് ആവാതിരിക്കാൻ 
        browser: ["Ubuntu", "Chrome", randomBrowserVersion],
        markOnlineOnConnect: false, 
        syncFullHistory: false, 
        generateHighQualityLinkPreview: false,
        connectTimeoutMs: 120000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 3000,
        maxMsgRetryCount: 10,
        getMessage: async (key) => {
            if (global.messageStore && global.messageStore[key.id]) {
                return global.messageStore[key.id].message;
            }
            return { conversation: ' ' }; // സേഫ് ബൈപാസ്, സ്പാം വരില്ല
        }
    });

    global.subBots[cleanNumber] = subSock;
    global.subBotLocks[cleanNumber] = false;

    subSock.ev.on("creds.update", saveCreds);

    // ─── PAIRING CODE ──────────────────────────────────
    if (!state.creds.registered && mainSock && jid) {
        setTimeout(async () => {
            try {
                let code = await subSock.requestPairingCode(cleanNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                await mainSock.sendMessage(jid, { 
                    text: `╭━━━〔 ✦ 𝑺𝑼𝑪𝑪𝑬𝑺𝑺 ✦ 〕━━━⬣\n┃ ✅ *Code Generated!*\n┃ 👤 *For:* +${cleanNumber}\n┃\n┃ _Copy the code sent below and_\n┃ _paste it in WhatsApp Linked Devices._\n╰━━━━━━━━━━━━━━━⬣` 
                }, { quoted: msg });
                
                await mainSock.sendMessage(jid, { text: code });
            } catch (error) {
                try { await mainSock.sendMessage(jid, { text: "⚠️ Server is busy! Please wait a few seconds and try again." }, { quoted: msg }); } catch (e) {}
                deleteSession(sessionPath);
            }
        }, 3000);
    }

    // ─── CONNECTION UPDATE ──────────────────────────────
    subSock.ev.on("connection.update", async (update) => {
        try {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
                console.log(`✅ [JADIBOT] +${cleanNumber} Connected!`);
                if (mainSock && jid && isNewSession) {
                    try { await mainSock.sendMessage(jid, { text: `✅ *Jadibot +${cleanNumber} connected successfully!*` }); } catch (e) {}
                }
            } else if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode;
                if (reason === DisconnectReason.loggedOut || reason === 401 || reason === 403) {
                    deleteSession(sessionPath);
                    delete global.subBots[cleanNumber];
                } else {
                    if (!global.subBotLocks[cleanNumber]) {
                        global.subBotLocks[cleanNumber] = true;
                        setTimeout(() => {
                            global.subBotLocks[cleanNumber] = false;
                            startSubBot(cleanNumber);
                        }, 5000);
                    }
                }
            }
        } catch (err) {}
    });

    // ─── CALL REJECT (ISOLATED) ─────────────────────────
    subSock.ev.on("call", async (calls) => {
        try {
            const config = getSettings(cleanNumber);
            if (!config.callReject) return;
            for (const call of calls) {
                if (call.status === "offer") {
                    try {
                        await subSock.rejectCall(call.id, call.from);
                        await subSock.sendMessage(call.from, { text: "📵 Calls are not allowed on this bot." });
                    } catch (e) {}
                }
            }
        } catch (err) {}
    });

    // ─── MESSAGES HANDLER (FULLY ISOLATED & UNBREAKABLE) ─────
    subSock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const subMsg = messages[0];
            if (!subMsg || !subMsg.message) return;

            const text = subMsg.message?.conversation ||
                         subMsg.message?.extendedTextMessage?.text ||
                         subMsg.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
                         subMsg.message?.viewOnceMessage?.message?.extendedTextMessage?.text ||
                         "";

            const prefix = process.env.PREFIX || '.';

            // 🛑 SPAM & LOOP FIX: ബോട്ടിന്റെ സ്വന്തം മെസ്സേജുകൾ ലൂപ്പ് ആകുന്നത് തടയുന്നു
            if (subMsg.key.fromMe && !text.startsWith(prefix)) return;

            const subJid = subMsg.key.remoteJid;
            const isGroup = subJid.endsWith("@g.us");
            
            // 🔥 പെയർ ബോട്ടിന്റെ സ്വന്തം ഡാറ്റാബേസ് 
            const config = getSettings(cleanNumber); 

            // ── AUTO STATUS VIEW ──
            if (subJid === 'status@broadcast') {
                if (config.autoStatusView) {
                    try { await subSock.readMessages([subMsg.key]); } catch (e) {}
                }
                return;
            }

            // 🎯 100% ACCURATE SENDER IDENTIFICATION (ഇവിടെയാണ് തെറ്റിയത്, ഇപ്പോൾ പൂർണ്ണമായി ഫിക്സ് ചെയ്തു!)
            const subSenderRaw = subMsg.key.fromMe ? subSock.user.id : (subMsg.key.participant || subMsg.key.remoteJid);
            const subSender = subSenderRaw ? subSenderRaw.split(':')[0].split('@')[0] + "@s.whatsapp.net" : "";
            
            // 🛡️ OWNER & SUDO VERIFICATION
            const sudoFile = path.join(process.cwd(), 'sudo.json');
            const dynamicSudoList = fs.existsSync(sudoFile) ? JSON.parse(fs.readFileSync(sudoFile)) : [];
            const isSudo = global.sudoUsers?.includes(subSender) || dynamicSudoList.includes(subSender);
            
            const botOwnerNumber = cleanNumber + "@s.whatsapp.net";
            const isSubOwner = subSender === botOwnerNumber || 
                               subSender === global.ownerNumber || 
                               isSudo;

            // ── BOT ONLINE CHECK ──
            if (!config.botOnline && !isSubOwner) return;

            // ── PRESENCE ──
            if (config.botOnline) {
                try { await subSock.sendPresenceUpdate("available", subJid); } catch (e) {}
            }

            // ── AUTO READ ──
            if (config.autoRead && !subMsg.key.fromMe) {
                try { await subSock.readMessages([subMsg.key]); } catch (e) {}
            }

            // ── AUTO REACT ──
            if (config.autoReact && !subMsg.key.fromMe) {
                try {
                    const emojis = ["❤️", "🔥", "😂", "👍", "✨", "💯", "🎉", "😎"];
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    await subSock.sendMessage(subJid, { react: { text: randomEmoji, key: subMsg.key } });
                } catch (e) {}
            }

            // ── PRIVATE MODE BLOCKER ──
            if (config.botMode === "private" && !isSubOwner) return;

            // ── ANTI LINK (ISOLATED) ──
            if (isGroup && config.antilinkChats?.includes(subJid) && text && !isSubOwner) {
                const linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
                if (linkRegex.test(text)) {
                    try {
                        const metadata = await subSock.groupMetadata(subJid);
                        const member = metadata.participants.find(p => p.id === subSender);
                        const isAdmin = member?.admin === "admin" || member?.admin === "superadmin";
                        if (!isAdmin) {
                            await subSock.sendMessage(subJid, { delete: subMsg.key });
                            await subSock.groupParticipantsUpdate(subJid, [subSender], "remove");
                            return;
                        }
                    } catch (e) {}
                }
            }

            // ── AUTO DOWNLOAD (ISOLATED) ──
            const autoDlEnabled =
                (config.autoDlChats && config.autoDlChats.includes(subJid)) ||
                (config.autoDlAllGroups && isGroup) ||
                (config.autoDlAllDms && !isGroup);

            if (autoDlEnabled && text && !text.startsWith(prefix) && !subMsg.key.fromMe) {
                try {
                    if (/instagram\.com/i.test(text)) {
                        const insta = global.commands.find(c => c.name === "insta");
                        if (insta) insta.execute(subSock, subMsg, [text], isSubOwner).catch(()=> {});
                    }
                    else if (/facebook\.com|fb\.watch/i.test(text)) {
                        const fb = global.commands.find(c => c.name === "fb");
                        if (fb) fb.execute(subSock, subMsg, [text], isSubOwner).catch(()=> {});
                    }
                    else if (/youtube\.com|youtu\.be/i.test(text)) {
                        const ytv = global.commands.find(c => c.name === "ytv");
                        if (ytv) ytv.execute(subSock, subMsg, [text], isSubOwner).catch(()=> {});
                    }
                } catch (e) {}
            }

            // ── COMMAND HANDLER ──
            const isWithoutHandler = config.withoutHandler || false;
            if (!text.startsWith(prefix) && !isWithoutHandler) return;

            const rawText = text.startsWith(prefix) ? text.slice(prefix.length).trim() : text.trim();
            const subArgs = rawText.split(/ +/);
            const commandName = subArgs.shift().toLowerCase();

            if (global.commands) {
                const command = global.commands.find(cmd =>
                    cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName))
                );
                if (command) {
                    try {
                        await command.execute(subSock, subMsg, subArgs, isSubOwner);
                    } catch (cmdErr) {
                        console.error(`Command error in SubBot:`, cmdErr.message);
                    }
                }
            }

        } catch (err) {}
    });
}

async function loadAllSubBots() {
    try {
        const clonesPath = path.join(process.cwd(), 'subbot_sessions');
        if (!fs.existsSync(clonesPath)) return;
        const folders = fs.readdirSync(clonesPath);
        
        for (const num of folders) {
            if (fs.existsSync(path.join(clonesPath, num, 'creds.json'))) {
                await startSubBot(num);
                await new Promise(resolve => setTimeout(resolve, 3500)); 
            }
        }
    } catch (error) {}
}

module.exports = { startSubBot, loadAllSubBots };