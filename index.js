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
function getBotName() {
    return global.config?.BOT_NAME || global.getBotName(botNumber) || "KIRA X MD";
}

function getPackName() {
    return global.config?.PACK_NAME || process.env.PACK_NAME || "KIRA X MD • Stickers";
}

function getAuthorName() {
    return global.config?.AUTHOR_NAME || process.env.AUTHOR_NAME || "User";
}

// സെഷൻ ക്ലിയർ ചെയ്യുമ്പോൾ എല്ലാം കംപ്ലീറ്റ് ഡിഫോൾട്ട് ആക്കാനുള്ള ഫങ്ഷൻ
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
    } catch (err) {
        console.error("Reset env error:", err.message);
    }
}

// ============================================================
// GLOBAL ERROR HANDLERS
// ============================================================

process.on("uncaughtException", (err) => {
    console.error("❌ UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("❌ UNHANDLED REJECTION:", reason);
});

// ============================================================
// GLOBALS
// ============================================================

global.messageStore = global.messageStore || {};
global.gameSessions = global.gameSessions || {};

global.antiFakeChats = global.antiFakeChats || [];
global.antiBotChats = global.antiBotChats || [];

global.sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

global.startTime = Date.now();

const mainOwnerPhone =
    process.env.OWNER_NUMBER ||
    process.env.BOT_NUMBER ||
    "";

global.ownerNumber =
    mainOwnerPhone.replace(/[^0-9]/g, "") +
    "@s.whatsapp.net";

global.sudoUsers = process.env.SUDO_NUMBERS
    ? process.env.SUDO_NUMBERS
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map(
            (x) =>
                x.replace(/[^0-9]/g, "") +
                "@s.whatsapp.net"
        )
    : [];

// ============================================================
// API GLOBALS
// ============================================================

global.api = {
    fb: process.env.FB_API,
    shazam: process.env.SHAZAM_API,
    giphy: process.env.GIPHY_API,
    serp: process.env.SERPAPI_KEY,
    insta: process.env.INSTA_API,

    geniusKeys: process.env.GENIUS_KEYS
        ? process.env.GENIUS_KEYS.split(";").filter(Boolean)
        : [],

    pinDl: process.env.PIN_DL_API,
    pinSearch: process.env.PIN_SEARCH_API,
    tenor: process.env.TENOR_API_KEY,

    ytVideo: process.env.YT_VIDEO_API,

    ytVideoList: process.env.YT_VIDEO_APIS
        ? process.env.YT_VIDEO_APIS.split(";").filter(Boolean)
        : [],

    ytmp3List: process.env.YT_MP3_APIS
        ? process.env.YT_MP3_APIS.split(";").filter(Boolean)
        : []
};

// ============================================================
// LOAD PLUGINS
// ============================================================

try {
    loadPlugins();
    global.commands = commands;

    console.log(`✅ Loaded ${commands.length} commands`);
} catch (err) {
    console.error("❌ Plugin loading failed:", err);
    process.exit(1);
}

// ============================================================
// HTTP SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end(`${getBotName()} is Running 24/7`);
}).listen(PORT, () => {
    console.log(`🌐 HTTP Server running on port ${PORT}`);
});

// ============================================================
// HELPERS
// ============================================================

function getBotNumber(sock) {
    try {
        return (
            sock.user?.id
                ?.split(":")[0]
                ?.replace(/[^0-9]/g, "") || ""
        );
    } catch {
        return "";
    }
}

function normalizeJid(jid) {
    if (!jid) return "";

    const number = jid
        .split(":")[0]
        .split("@")[0]
        .replace(/[^0-9]/g, "");

    return number
        ? `${number}@s.whatsapp.net`
        : jid;
}

function getSender(msg, sock) {
    if (msg.key?.fromMe) {
        return normalizeJid(sock.user?.id);
    }

    const raw =
        msg.key?.participant ||
        msg.participant ||
        msg.key?.remoteJid;

    return normalizeJid(raw);
}

function getMessageText(msg) {
    const message = msg.message || {};

    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||
        message.buttonsResponseMessage?.selectedButtonId ||
        message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        message.templateButtonReplyMessage?.selectedId ||
        ""
    ).trim();
}

function isGroupJid(jid) {
    return typeof jid === "string" && jid.endsWith("@g.us");
}

function isOldMessage(msg) {
    if (!msg.messageTimestamp) return false;

    const timestamp =
        Number(msg.messageTimestamp);

    if (!timestamp) return false;

    const now = Math.floor(Date.now() / 1000);

    return now - timestamp > 60;
}

// ============================================================
// SUDO CACHE
// ============================================================

const sudoFile = path.join(
    process.cwd(),
    "sudo.json"
);

let sudoCache = [];
let sudoMtime = 0;

function loadDynamicSudo() {
    try {
        if (!fs.existsSync(sudoFile)) {
            sudoCache = [];
            sudoMtime = 0;
            return;
        }

        const stat = fs.statSync(sudoFile);

        if (stat.mtimeMs === sudoMtime) {
            return;
        }

        const data = JSON.parse(
            fs.readFileSync(sudoFile, "utf8")
        );

        sudoCache = Array.isArray(data)
            ? data
                .map((x) => normalizeJid(x))
                .filter(Boolean)
            : [];

        sudoMtime = stat.mtimeMs;
    } catch (err) {
        console.error(
            "❌ sudo.json error:",
            err.message
        );

        sudoCache = [];
    }
}

loadDynamicSudo();

function isSudo(sender) {
    loadDynamicSudo();

    return (
        global.sudoUsers.includes(sender) ||
        sudoCache.includes(sender)
    );
}

// ============================================================
// OWNER CHECK
// ============================================================

function isBotOwner(sender, botNumber, msg) {
    if (msg.key?.fromMe) return true;

    const owner =
        normalizeJid(global.ownerNumber);

    const bot =
        normalizeJid(
            `${botNumber}@s.whatsapp.net`
        );

    return (
        sender === owner ||
        sender === bot
    );
}

// ============================================================
// COMMAND FINDER
// ============================================================

function findCommand(commandName) {
    const exact = commands.find(
        (cmd) =>
            String(cmd.name).toLowerCase() ===
            commandName
    );

    if (exact) return exact;

    return commands.find(
        (cmd) =>
            Array.isArray(cmd.alias) &&
            cmd.alias.some(
                (alias) =>
                    String(alias).toLowerCase() ===
                    commandName
            )
    );
}

// ============================================================
// MESSAGE STORE CLEANER
// ============================================================

setInterval(() => {
    try {
        const now = Date.now();
        const MAX_AGE = 60 * 60 * 1000;

        for (const [id, message] of Object.entries(
            global.messageStore
        )) {
            const timestamp =
                Number(message.messageTimestamp || 0) *
                1000;

            if (
                timestamp &&
                now - timestamp > MAX_AGE
            ) {
                delete global.messageStore[id];
            }
        }
    } catch (err) {
        console.error(
            "Message store cleanup error:",
            err.message
        );
    }
}, 10 * 60 * 1000);

// ============================================================
// SESSION PREPARATION
// ============================================================

function prepareSession() {
    const sessionDir = "./session";
    const credsPath =
        path.join(sessionDir, "creds.json");

    // Create session directory if missing
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, {
            recursive: true
        });
    }

    // --------------------------------------------------------
    // SESSION_ID
    // --------------------------------------------------------

    if (
        process.env.SESSION_ID &&
        !fs.existsSync(credsPath)
    ) {
        try {
            let sessionId =
                process.env.SESSION_ID.trim();

            if (sessionId.startsWith("KIRA~")) {
                sessionId =
                    sessionId.slice(5);
            }

            const decoded =
                Buffer.from(
                    sessionId,
                    "base64"
                ).toString();

            fs.writeFileSync(
                credsPath,
                decoded
            );

            console.log(
                "✅ SESSION_ID loaded successfully"
            );
        } catch (err) {
            console.error(
                "❌ SESSION_ID error:",
                err.message
            );
        }
    }

    // --------------------------------------------------------
    // CHECK BOT NUMBER
    // --------------------------------------------------------

    if (
        fs.existsSync(credsPath) &&
        process.env.BOT_NUMBER
    ) {
        try {
            const creds =
                JSON.parse(
                    fs.readFileSync(
                        credsPath,
                        "utf8"
                    )
                );

            const savedNumber =
                creds?.me?.id
                    ?.split(":")[0]
                    ?.replace(/[^0-9]/g, "");

            const envNumber =
                process.env.BOT_NUMBER
                    .replace(/[^0-9]/g, "");

            if (
                savedNumber &&
                envNumber &&
                savedNumber !== envNumber
            ) {
                console.log(
                    `⚠️ Session number changed: ${savedNumber} -> ${envNumber}`
                );

                fs.rmSync(
                    sessionDir,
                    {
                        recursive: true,
                        force: true
                    }
                );

                resetEnvToDefault();

                fs.mkdirSync(sessionDir, {
                    recursive: true
                });

                if (process.env.SESSION_ID) {
                    let sessionId =
                        process.env.SESSION_ID.trim();

                    if (
                        sessionId.startsWith("KIRA~")
                    ) {
                        sessionId =
                            sessionId.slice(5);
                    }

                    fs.writeFileSync(
                        credsPath,
                        Buffer.from(
                            sessionId,
                            "base64"
                        ).toString()
                    );
                }
            }
        } catch (err) {
            console.error(
                "Session check error:",
                err.message
            );
        }
    }
}

// ============================================================
// MAIN START FUNCTION
// ============================================================

let starting = false;
let reconnectTimer = null;
let activeSocket = null;

async function startKira() {
    if (starting) {
        console.log(
            `⚠️ ${getBotName()} is already starting...`
        );
        return;
    }

    starting = true;

    try {
        console.log(
            `\n🚀 Starting ${getBotName()}...`
        );

        prepareSession();

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(
            "./session"
        );

        const { version } = await fetchLatestWaWebVersion();
        
        console.log(
            `📡 Baileys version: ${version.join(".")}`
        );

        const sock = makeWASocket({
            version,

            logger: P({
                level: "silent"
            }),

            auth: {
                creds: state.creds,

                keys:
                    makeCacheableSignalKeyStore(
                        state.keys,
                        P({
                            level: "silent"
                        })
                    )
            },

            printQRInTerminal: false,

            browser: Browsers.macOS("Chrome"),

            markOnlineOnConnect: false,

            generateHighQualityLinkPreview: false,

            getMessage: async (key) => {
                try {
                    return (
                        global.messageStore[
                            key.id
                        ]?.message || {
                            conversation: ""
                        }
                    );
                } catch {
                    return {
                        conversation: ""
                    };
                }
            }
        });

        activeSocket = sock;
        starting = false;

        let pairingRequested = false;
        let connectionOpened = false;

        // ====================================================
        // CONNECTION UPDATE
        // ====================================================

        sock.ev.on(
            "connection.update",
            async (update) => {
                try {
                    const {
                        connection,
                        lastDisconnect,
                        qr
                    } = update;

                    // ------------------------------------------------
                    // PAIRING CODE
                    // ------------------------------------------------

                    if (
                        qr &&
                        !sock.authState.creds.registered &&
                        process.env.BOT_NUMBER &&
                        !pairingRequested
                    ) {
                        pairingRequested = true;

                        const phone =
                            process.env.BOT_NUMBER
                                .replace(
                                    /[^0-9]/g,
                                    ""
                                );

                        console.log(
                            `📲 Requesting pairing code for +${phone}...`
                        );

                        try {
                            const code =
                                await sock.requestPairingCode(
                                    phone
                                );

                            const formatted =
                                code
                                    ?.match(
                                        /.{1,4}/g
                                    )
                                    ?.join("-") ||
                                code;

                            console.log(
                                "\n===================================="
                            );

                            console.log(
                                `🔑 KIRA X MD PAIRING CODE:`,
                                formatted
                            );

                            console.log(
                                "====================================\n"
                            );
                        } catch (err) {
                            console.error(
                                "❌ Pairing code error:",
                                err.message
                            );

                            pairingRequested =
                                false;
                        }
                    }

                    // ------------------------------------------------
                    // CONNECTED
                    // ------------------------------------------------

                    if (
                        connection === "open"
                    ) {
                        connectionOpened =
                            true;

                        console.log(
                            "\n===================================="
                        );

                        console.log(
                        `✅ KIRA X MD CONNECTED`
                    );

                        console.log(
                            "🤖 Bot:",
                            getBotNumber(sock)
                        );

                        console.log(
                            "====================================\n"
                        );

                        // Load subbots only once
                        if (
                            !global.subBotsLoaded
                        ) {
                            global.subBotsLoaded =
                                true;

                            try {
                                await loadAllSubBots();
                                console.log(
                                    "🤖 Sub-bots loaded"
                                );
                            } catch (err) {
                                console.error(
                                    "❌ Subbot loading error:",
                                    err.message
                                );
                            }
                        }

                        // Optional group auto join
                        if (
                            !global.kiraStartupDone
                        ) {
                            global.kiraStartupDone =
                                true;

                            setTimeout(
                                async () => {
                                    try {
                                        const invite =
                                            process.env
                                                .AUTO_JOIN_GROUP;

                                        if (
                                            invite
                                        ) {
                                            await sock.groupAcceptInvite(
                                                invite
                                            );

                                            console.log(
                                                "✅ Auto-joined group"
                                            );
                                        }
                                    } catch (err) {
                                        // Silent
                                    }

                                    // Startup owner notification
                                    try {
                                        const owner =
                                            normalizeJid(
                                                global.ownerNumber
                                            );

                                        if (
                                            owner
                                        ) {
                                            await sock.sendMessage(
                                                owner,
                                                {
                                                    text:
                                                        `╭━━━〔 KIRA X MD 〕━━━⬣\n\n` +
                                                        `✅ *Connected Successfully*\n` +
                                                        `🛡️ *Status:* Active\n` +
                                                        `🤖 *Bot:* KIRA X MD\n\n` +
                                                        `╰━━━━━━━━━━━━━━⬣`
                                                }
                                            );
                                        }
                                    } catch (err) {}
                                },
                                2000
                            );
                        }
                    }

                    // ------------------------------------------------
                    // CONNECTION CLOSED
                    // ------------------------------------------------

                    if (
                        connection === "close"
                    ) {
                        const statusCode =
                            lastDisconnect
                                ?.error
                                ?.output
                                ?.statusCode;

                        const loggedOut =
                            statusCode ===
                                DisconnectReason.loggedOut ||
                            statusCode === 401 ||
                            statusCode === 403;

                        console.log(
                            "⚠️ Connection closed:",
                            statusCode
                        );

                        if (
                            loggedOut
                        ) {
                            console.log(
                                "❌ WhatsApp session logged out."
                            );

                            try {
                                fs.rmSync(
                                    "./session",
                                    {
                                        recursive: true,
                                        force: true
                                    }
                                );
                                resetEnvToDefault();
                            } catch {}

                            process.exit(1);
                        }

                        if (
                            reconnectTimer
                        ) {
                            return;
                        }

                        console.log(
                            "🔄 Reconnecting in 3 seconds..."
                        );

                        reconnectTimer =
                            setTimeout(
                                async () => {
                                    reconnectTimer =
                                        null;

                                    try {
                                        await startKira();
                                    } catch (err) {
                                        console.error(
                                            "❌ Reconnect error:",
                                            err.message
                                        );
                                    }
                                },
                                3000
                            );
                    }
                } catch (err) {
                    console.error(
                        "Connection update error:",
                        err
                    );
                }
            }
        );

        // ====================================================
        // SAVE CREDS
        // ====================================================

        sock.ev.on(
            "creds.update",
            saveCreds
        );

        // ====================================================
        // CALL REJECT
        // ====================================================

        sock.ev.on(
            "call",
            async (calls) => {
                try {
                    const botNumber =
                        getBotNumber(sock);

                    if (!botNumber)
                        return;

                    const config =
                        getSettings(
                            botNumber
                        );

                    if (
                        !config.callReject
                    )
                        return;

                    for (
                        const call of calls
                    ) {
                        if (
                            call.status ===
                            "offer"
                        ) {
                            try {
                                await sock.rejectCall(
                                    call.id,
                                    call.from
                                );
                            } catch {}

                            try {
                                await sock.sendMessage(
                                    call.from,
                                    {
                                        text:
                                            "📵 *Calls are not allowed.*\nPlease send a message instead."
                                    }
                                );
                            } catch {}
                        }
                    }
                } catch (err) {
                    console.error(
                        "Call handler:",
                        err.message
                    );
                }
            }
        );

        // ====================================================
        // ANTI DELETE
        // ====================================================

        const processedDeletes =
            new Set();

        async function handleDelete(
            key
        ) {
            try {
                if (!key?.id)
                    return;

                const deleteId =
                    `${key.remoteJid}:${key.id}`;

                if (
                    processedDeletes.has(
                        deleteId
                    )
                ) {
                    return;
                }

                processedDeletes.add(
                    deleteId
                );

                setTimeout(
                    () => {
                        processedDeletes.delete(
                            deleteId
                        );
                    },
                    30000
                );

                const botNumber =
                    getBotNumber(sock);

                if (!botNumber)
                    return;

                const config =
                    getSettings(
                        botNumber
                    );

                const jid =
                    key.remoteJid;

                if (
                    !config
                        .antiDeleteChats
                        ?.includes(jid)
                ) {
                    return;
                }

                const deleted =
                    global.messageStore[
                        key.id
                    ];

                if (!deleted)
                    return;

                const sender =
                    normalizeJid(
                        deleted.participant ||
                        deleted.key?.participant ||
                        deleted.key?.remoteJid
                    );

                const targetJid =
                    config
                        .antiDeleteMode
                        ?. [jid] ===
                    "chat"
                        ? jid
                        : normalizeJid(
                            global.ownerNumber
                        );

                if (!targetJid)
                    return;

                await sock.sendMessage(
                    targetJid,
                    {
                        text:
                            `🚨 *DELETED MESSAGE*\n\n` +
                            `👤 *User:* @${sender.split("@")[0]}\n` +
                            `💬 *Chat:* ${jid}`,
                        mentions: sender
                            ? [sender]
                            : []
                    }
                );

                try {
                    await sock.sendMessage(
                        targetJid,
                        {
                            forward: deleted
                        }
                    );
                } catch (err) {
                    console.error(
                        "AntiDelete forward error:",
                        err.message
                    );
                }
            } catch (err) {
                console.error(
                    "AntiDelete error:",
                    err.message
                );
            }
        }

        // Newer Baileys delete event
        sock.ev.on(
            "messages.delete",
            async ({
                keys
            }) => {
                if (!Array.isArray(keys))
                    return;

                for (
                    const key of keys
                ) {
                    await handleDelete(
                        key
                    );
                }
            }
        );

        // Compatibility with existing event style
        sock.ev.on(
            "messages.update",
            async (updates) => {
                try {
                    for (
                        const update of updates
                    ) {
                        if (
                            update.update
                                ?.message ===
                            null
                        ) {
                            await handleDelete(
                                update.key
                            );
                        }
                    }
                } catch (err) {
                    console.error(
                        "messages.update error:",
                        err.message
                    );
                }
            }
        );

        // ====================================================
        // GROUP EVENTS
        // ====================================================

        sock.ev.on(
            "group-participants.update",
            async (update) => {
                try {
                    const botNumber =
                        getBotNumber(sock);

                    if (!botNumber)
                        return;

                    const config =
                        getSettings(
                            botNumber
                        );

                    const jid =
                        update.id;

                    const action =
                        update.action;

                    if (
                        !Array.isArray(
                            update.participants
                        )
                    ) {
                        return;
                    }

                    for (
                        const participant
                        of update.participants
                    ) {
                        const user =
                            typeof participant ===
                            "string"
                                ? participant
                                : participant.id;

                        if (!user)
                            continue;

                        // --------------------------------------------
                        // WELCOME
                        // --------------------------------------------

                        if (
                            (
                                action ===
                                    "add" ||
                                action ===
                                    "join"
                            ) &&
                            config
                                .welcomeChats
                                ?.includes(jid)
                        ) {
                            try {
                                await sock.sendMessage(
                                    jid,
                                    {
                                        text:
                                            `🎉 *Welcome @${user.split("@")[0]}!*`,
                                        mentions: [
                                            user
                                        ]
                                    }
                                );
                            } catch {}
                        }

                        // --------------------------------------------
                        // GOODBYE
                        // --------------------------------------------

                        if (
                            (
                                action ===
                                    "remove" ||
                                action ===
                                    "leave"
                            ) &&
                            config
                                .goodbyeChats
                                ?.includes(jid)
                        ) {
                            try {
                                await sock.sendMessage(
                                    jid,
                                    {
                                        text:
                                            `👋 *Goodbye @${user.split("@")[0]}!*`,
                                        mentions: [
                                            user
                                        ]
                                    }
                                );
                            } catch {}
                        }

                        // --------------------------------------------
                        // ANTI FAKE
                        // --------------------------------------------

                        if (
                            (
                                action ===
                                    "add" ||
                                action ===
                                    "join"
                            ) &&
                            global
                                .antiFakeChats
                                ?.includes(jid)
                        ) {
                            const number =
                                user
                                    .split("@")[0]
                                    .replace(
                                        /[^0-9]/g,
                                        ""
                                    );

                            if (
                                number &&
                                !number.startsWith(
                                    "91"
                                )
                            ) {
                                try {
                                    await sock.groupParticipantsUpdate(
                                        jid,
                                        [user],
                                        "remove"
                                    );
                                } catch {}
                            }
                        }

                        // --------------------------------------------
                        // ANTI BOT
                        // --------------------------------------------

                        if (
                            (
                                action ===
                                    "add" ||
                                action ===
                                    "join"
                            ) &&
                            global
                                .antiBotChats
                                ?.includes(jid)
                        ) {
                            if (
                                user.includes(":")
                            ) {
                                try {
                                    await sock.groupParticipantsUpdate(
                                        jid,
                                        [user],
                                        "remove"
                                    );
                                } catch {}
                            }
                        }
                    }
                } catch (err) {
                    console.error(
                        "Group event error:",
                        err.message
                    );
                }
            }
        );

        // ====================================================
        // MASTER MESSAGE HANDLER
        // ====================================================

        sock.ev.on(
            "messages.upsert",
            async ({
                messages,
                type
            }) => {
                try {
                    if (
                        !Array.isArray(
                            messages
                        ) ||
                        !messages.length
                    ) {
                        return;
                    }

                    for (
                        const msg of messages
                    ) {
                        // ------------------------------------------------
                        // BASIC VALIDATION
                        // ------------------------------------------------

                        if (
                            !msg?.message ||
                            !msg?.key
                        ) {
                            continue;
                        }

                        if (
                            isOldMessage(msg)
                        ) {
                            continue;
                        }

                        const jid =
                            msg.key.remoteJid;

                        if (!jid)
                            continue;

                        // ------------------------------------------------
                        // STATUS
                        // ------------------------------------------------

                        const botNumber =
                            getBotNumber(sock);

                        if (!botNumber)
                            continue;

                        const config =
                            getSettings(
                                botNumber
                            );

                        if (
                            jid ===
                            "status@broadcast"
                        ) {
                            if (
                                config
                                    .autoStatusView
                            ) {
                                try {
                                    await sock.readMessages(
                                        [
                                            msg.key
                                        ]
                                    );
                                } catch {}
                            }

                            continue;
                        }

                        // ------------------------------------------------
                        // IGNORE SYSTEM EVENTS
                        // ------------------------------------------------

                        if (
                            msg.message
                                .protocolMessage ||
                            msg.message
                                .reactionMessage
                        ) {
                            continue;
                        }

                        // ------------------------------------------------
                        // STORE MESSAGE
                        // ------------------------------------------------

                        if (
                            msg.key.id
                        ) {
                            global.messageStore[
                                msg.key.id
                            ] = msg;
                        }

                        const isGroup =
                            isGroupJid(jid);

                        // ------------------------------------------------
                        // SENDER
                        // ------------------------------------------------

                        const sender =
                            getSender(
                                msg,
                                sock
                            );

                        // ------------------------------------------------
                        // OWNER / SUDO
                        // ------------------------------------------------

                        const isOwner =
                            isBotOwner(
                                sender,
                                botNumber,
                                msg
                            );

                        const sudo =
                            isSudo(
                                sender
                            );

                        const isOwnerOrSudo =
                            isOwner ||
                            sudo;

                        // ------------------------------------------------
                        // TEXT
                        // ------------------------------------------------

                        const text =
                            getMessageText(
                                msg
                            );

                        // ------------------------------------------------
                        // BOT MODE
                        // ------------------------------------------------

                        if (
                            config.botMode ===
                                "private" &&
                            !isOwnerOrSudo
                        ) {
                            continue;
                        }

                        // ------------------------------------------------
                        // AUTO READ
                        // ------------------------------------------------

                        if (
                            config.autoRead &&
                            !msg.key.fromMe
                        ) {
                            try {
                                await sock.readMessages(
                                    [
                                        msg.key
                                    ]
                                );
                            } catch {}
                        }

                        // ------------------------------------------------
                        // AUTO REACT
                        // ------------------------------------------------

                        if (
                            config.autoReact &&
                            !msg.key.fromMe
                        ) {
                            const emojis = [
                                "❤️",
                                "🎀",
                                "😎",
                                "🫣",
                                "🫀",
                                "😭",
                                "🥰",
                                "🍁"
                            ];

                            const emoji =
                                emojis[
                                    Math.floor(
                                        Math.random() *
                                            emojis.length
                                    )
                                ];

                            // Don't block command processing
                            sock.sendMessage(
                                jid,
                                {
                                    react: {
                                        text: emoji,
                                        key: msg.key
                                    }
                                }
                            ).catch(() => {});
                        }

                        // ------------------------------------------------
                        // ANTILINK
                        // ------------------------------------------------

                        if (
                            isGroup &&
                            text &&
                            config
                                .antilinkChats
                                ?.includes(jid) &&
                            !isOwnerOrSudo
                        ) {
                            const linkRegex =
                                /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

                            if (
                                linkRegex.test(
                                    text
                                )
                            ) {
                                try {
                                    const metadata =
                                        await sock.groupMetadata(
                                            jid
                                        );

                                    const realSender =
                                        msg.key
                                            .participant ||
                                        msg.participant ||
                                        sender;

                                    const member =
                                        metadata.participants.find(
                                            (p) =>
                                                p.id ===
                                                    realSender ||
                                                p.id ===
                                                    sender ||
                                                p.id
                                                    ?.split(
                                                        "@"
                                                    )[0] ===
                                                    sender.split(
                                                        "@"
                                                    )[0]
                                        );

                                    const isAdmin =
                                        member?.admin ===
                                            "admin" ||
                                        member?.admin ===
                                            "superadmin";

                                    if (
                                        !isAdmin
                                    ) {
                                        const mode =
                                            config
                                                .antilinkMode
                                                ?. [jid] ||
                                            "delete";

                                        try {
                                            await sock.sendMessage(
                                                jid,
                                                {
                                                    delete:
                                                        msg.key
                                                }
                                            );
                                        } catch {}

                                        if (
                                            mode ===
                                            "warn"
                                        ) {
                                            await sock.sendMessage(
                                                jid,
                                                {
                                                    text:
                                                        `⚠️ *@${sender.split("@")[0]}*, WhatsApp group links are not allowed here.`,
                                                    mentions: [
                                                        sender
                                                    ]
                                                }
                                            );
                                        }

                                        else if (
                                            mode ===
                                            "kick"
                                        ) {
                                            await sock.sendMessage(
                                                jid,
                                                {
                                                    text:
                                                        `🚫 *@${sender.split("@")[0]}* sent a group link. Removing...`,
                                                    mentions: [
                                                        sender
                                                    ]
                                                }
                                            );

                                            setTimeout(
                                                async () => {
                                                    try {
                                                        await sock.groupParticipantsUpdate(
                                                            jid,
                                                            [
                                                                member?.id ||
                                                                    realSender
                                                            ],
                                                            "remove"
                                                        );
                                                    } catch {}
                                                },
                                                1000
                                            );
                                        }

                                        continue;
                                    }
                                } catch (
                                    err
                                ) {
                                    console.error(
                                        "AntiLink error:",
                                        err.message
                                    );
                                }
                            }
                        }

                        // ------------------------------------------------
                        // AUTO DOWNLOAD
                        // ------------------------------------------------

                        const autoDlEnabled =
                            config
                                .autoDlChats
                                ?.includes(jid) ||
                            (
                                config
                                    .autoDlAllGroups &&
                                isGroup
                            ) ||
                            (
                                config
                                    .autoDlAllDms &&
                                !isGroup
                            );

                        const prefix =
                            process.env
                                .PREFIX ||
                            ".";

                        if (
                            autoDlEnabled &&
                            text &&
                            !text.startsWith(
                                prefix
                            )
                        ) {
                            try {
                                // NO 2 SECOND SLEEP HERE
                                // This was causing unnecessary delay.

                                if (
                                    /instagram\.com/i.test(
                                        text
                                    )
                                ) {
                                    const insta =
                                        findCommand(
                                            "insta"
                                        );

                                    if (
                                        insta
                                    ) {
                                        await insta.execute(
                                            sock,
                                            msg,
                                            [text],
                                            isOwnerOrSudo
                                        );
                                    }

                                    continue;
                                }

                                if (
                                    /facebook\.com|fb\.watch|fb\.gg/i.test(
                                        text
                                    )
                                ) {
                                    const fb =
                                        findCommand(
                                            "fb"
                                        );

                                    if (
                                        fb
                                    ) {
                                        await fb.execute(
                                            sock,
                                            msg,
                                            [text],
                                            isOwnerOrSudo
                                        );
                                    }

                                    continue;
                                }

                                if (
                                    /youtube\.com|youtu\.be/i.test(
                                        text
                                    )
                                ) {
                                    const ytv =
                                        findCommand(
                                            "ytv"
                                        );

                                    if (
                                        ytv
                                    ) {
                                        await ytv.execute(
                                            sock,
                                            msg,
                                            [text],
                                            isOwnerOrSudo
                                        );
                                    }

                                    continue;
                                }
                            } catch (
                                err
                            ) {
                                console.error(
                                    "AutoDL error:",
                                    err.message
                                );
                            }
                        }

                        // ------------------------------------------------
                        // COMMAND PARSING
                        // ------------------------------------------------

                        let args;

                        if (
                            text.startsWith(
                                prefix
                            )
                        ) {
                            const commandText =
                                text
                                    .slice(
                                        prefix.length
                                    )
                                    .trim();

                            if (
                                !commandText
                            ) {
                                continue;
                            }

                            args =
                                commandText.split(
                                    /\s+/
                                );
                        }

                        else if (
                            config.withoutHandler
                        ) {
                            if (!text)
                                continue;

                            args =
                                text.split(
                                    /\s+/
                                );
                        }

                        else {
                            continue;
                        }

                        const commandName =
                            String(
                                args.shift() ||
                                    ""
                            ).toLowerCase();

                        if (
                            !commandName
                        ) {
                            continue;
                        }

                        // ------------------------------------------------
                        // .ME
                        // ------------------------------------------------

                        if (
                            commandName ===
                            "me"
                        ) {
                            if (
                                !isOwnerOrSudo
                            ) {
                                await sock.sendMessage(
                                    jid,
                                    {
                                        text:
                                            "❌ *Owner only!*"
                                    },
                                    {
                                        quoted:
                                            msg
                                    }
                                );

                                continue;
                            }

                            await sock.sendMessage(
                                jid,
                                {
                                    text:
                                        `😎 *That's me!*\n\n👉 @${sender.split("@")[0]}`,
                                    mentions: [
                                        sender
                                    ]
                                },
                                {
                                    quoted:
                                        msg
                                }
                            );

                            continue;
                        }

                        // ------------------------------------------------
                        // FIND COMMAND
                        // ------------------------------------------------

                        const command =
                            findCommand(
                                commandName
                            );

                        if (!command)
                            continue;

                        // ------------------------------------------------
                        // PRIVATE MODE
                        // ------------------------------------------------

                        if (
                            config.botMode ===
                                "private" &&
                            !isOwnerOrSudo
                        ) {
                            continue;
                        }

                        // ------------------------------------------------
                        // OWNER COMMAND
                        // ------------------------------------------------

                        if (
                            command.category ===
                                "owner" &&
                            !isOwnerOrSudo
                        ) {
                            await sock.sendMessage(
                                jid,
                                {
                                    text:
                                        "❌ *Owner only command!*"
                                },
                                {
                                    quoted:
                                        msg
                                }
                            );

                            continue;
                        }

                        // ------------------------------------------------
                        // EXECUTE
                        // ------------------------------------------------

                        try {
                            await command.execute(
                                sock,
                                msg,
                                args,
                                isOwnerOrSudo
                            );
                        } catch (
                            cmdErr
                        ) {
                            console.error(
                                `❌ Command "${command.name}" error:`,
                                cmdErr
                            );

                            try {
                                await sock.sendMessage(
                                    jid,
                                    {
                                        text:
                                            "❌ *Something went wrong while executing this command.*"
                                    },
                                    {
                                        quoted:
                                            msg
                                    }
                                );
                            } catch {}
                        }
                    }
                } catch (err) {
                    console.error(
                        "❌ Message handler error:",
                        err
                    );
                }
            }
        );

        // ====================================================
        // EXTERNAL PLUGIN EVENT LISTENERS
        // ====================================================

        try {
            const antiPromotePlugin =
                require(
                    "./plugins/antipromote.js"
                );

            if (
                antiPromotePlugin &&
                typeof antiPromotePlugin
                    .initAntiPromote ===
                    "function"
            ) {
                antiPromotePlugin.initAntiPromote(
                    sock
                );

                console.log(
                    "🛡️ AntiPromote listener loaded"
                );
            }
        } catch (err) {
            console.error(
                "❌ AntiPromote load error:",
                err.message
            );
        }

        try {
            const groupManager =
                require(
                    "./plugins/group_manager.js"
                );

            if (
                groupManager &&
                typeof groupManager
                    .initGroupEvents ===
                    "function"
            ) {
                groupManager.initGroupEvents(
                    sock
                );

                console.log(
                    "👥 Group manager loaded"
                );
            }
        } catch (err) {
            console.error(
                "❌ Group manager load error:",
                err.message
            );
        }

        try {
            const mentionMePlugin =
                require(
                    "./plugins/mentionme.js"
                );

            if (
                mentionMePlugin &&
                typeof mentionMePlugin
                    .initMentionMe ===
                    "function"
            ) {
                mentionMePlugin.initMentionMe(
                    sock
                );

                console.log(
                    "🎤 MentionMe listener loaded"
                );
            }
        } catch (err) {
            console.error(
                "❌ MentionMe load error:",
                err.message
            );
        }

        return sock;

    } catch (err) {
        starting = false;

        console.error(
            "❌ START KIRA ERROR:",
            err
        );

        if (
            !reconnectTimer
        ) {
            reconnectTimer =
                setTimeout(
                    async () => {
                        reconnectTimer =
                            null;

                        try {
                            await startKira();
                        } catch (
                            reconnectError
                        ) {
                            console.error(
                                "❌ Retry failed:",
                                reconnectError.message
                            );
                        }
                    },
                    5000
                );
        }
    }
}

// ============================================================
// START
// ============================================================

(async () => {
    try {
        await startKira();
    } catch (err) {
        console.error(
            "❌ FATAL START ERROR:",
            err
        );
    }
})();