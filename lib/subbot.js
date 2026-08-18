// lib/subbot.js - KIRA X MD
// Stable / Fast / Reconnect Safe Sub-Bot System
// Compatible with @whiskeysockets/baileys 7.x

require("events").EventEmitter.defaultMaxListeners = 0;

const fs = require("fs");
const path = require("path");
const pino = require("pino");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const { getSettings } = require("./database");

// ─────────────────────────────────────────────
// GLOBALS
// ─────────────────────────────────────────────

global.subBots = global.subBots || {};
global.subBotLocks = global.subBotLocks || {};
global.subBotStarting = global.subBotStarting || {};
global.subBotReconnectTimers = global.subBotReconnectTimers || {};
global.subBotGeneration = global.subBotGeneration || {};
global.messageStore = global.messageStore || {};

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const SESSION_ROOT = path.join(
    process.cwd(),
    "subbot_sessions"
);

const SUDO_FILE = path.join(
    process.cwd(),
    "sudo.json"
);

const LOG = "[SUBBOT]";

const RECONNECT_DELAY = 5000;
const PAIRING_DELAY = 2500;
const MESSAGE_STORE_LIMIT = 5000;
const MESSAGE_STORE_KEEP = 3500;

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function cleanNumber(number) {
    return String(number || "")
        .replace(/[^0-9]/g, "");
}

function normalizeJid(jid) {
    if (!jid) {
        return "";
    }

    const number = String(jid)
        .split(":")[0]
        .split("@")[0]
        .replace(/[^0-9]/g, "");

    return number
        ? `${number}@s.whatsapp.net`
        : "";
}

function isGroupJid(jid) {
    return (
        typeof jid === "string" &&
        jid.endsWith("@g.us")
    );
}

function getMessageText(message) {
    if (!message) {
        return "";
    }

    return (
        message.conversation ||
        message.extendedTextMessage?.text ||

        message.ephemeralMessage
            ?.message
            ?.conversation ||

        message.ephemeralMessage
            ?.message
            ?.extendedTextMessage
            ?.text ||

        message.viewOnceMessage
            ?.message
            ?.conversation ||

        message.viewOnceMessage
            ?.message
            ?.extendedTextMessage
            ?.text ||

        message.viewOnceMessageV2
            ?.message
            ?.conversation ||

        message.viewOnceMessageV2
            ?.message
            ?.extendedTextMessage
            ?.text ||

        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||

        message.ephemeralMessage
            ?.message
            ?.imageMessage
            ?.caption ||

        message.ephemeralMessage
            ?.message
            ?.videoMessage
            ?.caption ||

        message.ephemeralMessage
            ?.message
            ?.documentMessage
            ?.caption ||

        message.viewOnceMessage
            ?.message
            ?.imageMessage
            ?.caption ||

        message.viewOnceMessage
            ?.message
            ?.videoMessage
            ?.caption ||

        ""
    );
}

function isReactionOrProtocol(message) {
    return !!(
        message?.reactionMessage ||
        message?.protocolMessage ||
        message?.ephemeralMessage
            ?.message
            ?.reactionMessage
    );
}

function getSessionPath(number) {
    return path.join(
        SESSION_ROOT,
        number
    );
}

// ─────────────────────────────────────────────
// SAFE SESSION DELETE
// ─────────────────────────────────────────────

function deleteSession(sessionPath) {
    try {
        if (!fs.existsSync(sessionPath)) {
            return;
        }

        fs.rmSync(
            sessionPath,
            {
                recursive: true,
                force: true
            }
        );

    } catch (err) {

        console.error(
            `${LOG} Session delete error:`,
            err.message
        );
    }
}

// ─────────────────────────────────────────────
// SUDO
// ─────────────────────────────────────────────

function loadSudoUsers() {
    try {

        if (!fs.existsSync(SUDO_FILE)) {
            return [];
        }

        const data =
            JSON.parse(
                fs.readFileSync(
                    SUDO_FILE,
                    "utf8"
                )
            );

        if (!Array.isArray(data)) {
            return [];
        }

        return data
            .map(x => normalizeJid(x))
            .filter(Boolean);

    } catch (err) {

        console.error(
            `${LOG} sudo.json error:`,
            err.message
        );

        return [];
    }
}

// ─────────────────────────────────────────────
// COMMAND FINDER
// ─────────────────────────────────────────────

function getCommand(name) {

    if (
        !global.commands ||
        !Array.isArray(global.commands)
    ) {
        return null;
    }

    const commandName =
        String(name || "")
            .toLowerCase();

    return global.commands.find(cmd => {

        if (!cmd) {
            return false;
        }

        if (
            String(cmd.name || "")
                .toLowerCase() ===
            commandName
        ) {
            return true;
        }

        if (Array.isArray(cmd.alias)) {

            return cmd.alias.some(
                alias =>
                    String(alias)
                        .toLowerCase() ===
                    commandName
            );
        }

        return false;
    });
}

// ─────────────────────────────────────────────
// MESSAGE STORE
// ─────────────────────────────────────────────

function getMessageStoreKey(msg) {
    if (!msg?.key?.id) {
        return "";
    }

    return [
        msg.key.remoteJid || "",
        msg.key.id
    ].join(":");
}

function storeMessage(msg) {

    try {

        const key =
            getMessageStoreKey(msg);

        if (!key) {
            return;
        }

        global.messageStore[key] = msg;

        const keys =
            Object.keys(
                global.messageStore
            );

        if (
            keys.length >
            MESSAGE_STORE_LIMIT
        ) {

            const removeCount =
                keys.length -
                MESSAGE_STORE_KEEP;

            for (
                let i = 0;
                i < removeCount;
                i++
            ) {

                delete global.messageStore[
                    keys[i]
                ];
            }
        }

    } catch {}
}

function getStoredMessage(key) {

    try {

        const storeKey = [
            key?.remoteJid || "",
            key?.id || ""
        ].join(":");

        return (
            global.messageStore?.[
                storeKey
            ] || null
        );

    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────
// CLEAR RECONNECT TIMER
// ─────────────────────────────────────────────

function clearReconnectTimer(number) {

    try {

        const timer =
            global.subBotReconnectTimers[
                number
            ];

        if (timer) {

            clearTimeout(timer);

            delete global.subBotReconnectTimers[
                number
            ];
        }

    } catch {}
}

// ─────────────────────────────────────────────
// RECONNECT
// ─────────────────────────────────────────────

function scheduleReconnect(number) {

    const clean =
        cleanNumber(number);

    if (!clean) {
        return;
    }

    // Don't create duplicate reconnect timers.
    if (
        global.subBotReconnectTimers[
            clean
        ]
    ) {
        return;
    }

    // If another socket is already connected,
    // don't reconnect.
    if (global.subBots[clean]) {
        return;
    }

    console.log(
        `${LOG} Reconnecting +${clean} in ${RECONNECT_DELAY / 1000} seconds...`
    );

    global.subBotReconnectTimers[
        clean
    ] = setTimeout(
        async () => {

            delete global.subBotReconnectTimers[
                clean
            ];

            if (global.subBots[clean]) {
                return;
            }

            try {

                await startSubBot(
                    clean
                );

            } catch (err) {

                console.error(
                    `${LOG} Reconnect error +${clean}:`,
                    err.message
                );

                // Retry again if necessary.
                if (
                    !global.subBots[clean]
                ) {
                    scheduleReconnect(
                        clean
                    );
                }
            }

        },
        RECONNECT_DELAY
    );
}

// ─────────────────────────────────────────────
// START SUBBOT
// ─────────────────────────────────────────────

async function startSubBot(
    phoneNumber,
    mainSock = null,
    requestJid = null,
    requestMsg = null
) {

    const clean =
        cleanNumber(phoneNumber);

    if (!clean) {

        console.log(
            `${LOG} Invalid phone number.`
        );

        return null;
    }

    // Already connected.
    if (global.subBots[clean]) {

        console.log(
            `${LOG} +${clean} is already running.`
        );

        return global.subBots[clean];
    }

    // Already starting.
    if (
        global.subBotStarting[clean]
    ) {

        console.log(
            `${LOG} +${clean} is already starting.`
        );

        return null;
    }

    clearReconnectTimer(clean);

    global.subBotStarting[clean] = true;

    // Create a unique generation for this socket.
    global.subBotGeneration[clean] =
        (global.subBotGeneration[clean] || 0) + 1;

    const generation =
        global.subBotGeneration[clean];

    const sessionPath =
        getSessionPath(clean);

    let subSock = null;

    try {

        // ─────────────────────────────────────
        // SESSION DIRECTORY
        // ─────────────────────────────────────

        if (
            !fs.existsSync(
                SESSION_ROOT
            )
        ) {

            fs.mkdirSync(
                SESSION_ROOT,
                {
                    recursive: true
                }
            );
        }

        if (
            !fs.existsSync(
                sessionPath
            )
        ) {

            fs.mkdirSync(
                sessionPath,
                {
                    recursive: true
                }
            );
        }

        // ─────────────────────────────────────
        // AUTH
        // ─────────────────────────────────────

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(
            sessionPath
        );

        // ─────────────────────────────────────
        // BAILEYS VERSION
        // ─────────────────────────────────────

        const {
            version
        } =
            await fetchLatestBaileysVersion();

        console.log(
            `${LOG} Starting +${clean} using Baileys ${version.join(".")}`
        );

        const logger =
            pino({
                level: "silent"
            });

        // ─────────────────────────────────────
        // SOCKET
        // ─────────────────────────────────────

        subSock =
            makeWASocket({

                version,

                logger,

                auth: {
                    creds: state.creds,

                    keys:
                        makeCacheableSignalKeyStore(
                            state.keys,
                            logger
                        )
                },

                printQRInTerminal: false,

                browser: [
                    "KIRA X MD",
                    "Chrome",
                    "1.0.0"
                ],

                markOnlineOnConnect: false,

                syncFullHistory: false,

                generateHighQualityLinkPreview:
                    false,

                connectTimeoutMs:
                    60000,

                defaultQueryTimeoutMs:
                    60000,

                keepAliveIntervalMs:
                    25000,

                retryRequestDelayMs:
                    2000,

                maxMsgRetryCount:
                    5,

                getMessage:
                    async key => {

                        try {

                            const saved =
                                getStoredMessage(
                                    key
                                );

                            if (
                                saved?.message
                            ) {

                                return saved.message;
                            }

                        } catch {}

                        return {
                            conversation: ""
                        };
                    }
            });

        // ─────────────────────────────────────
        // REGISTER SOCKET
        // ─────────────────────────────────────

        global.subBots[clean] =
            subSock;

        global.subBotStarting[clean] =
            false;

        // IMPORTANT:
        // Lock is NOT kept true here.
        // Reconnect is controlled by the timer system.
        global.subBotLocks[clean] =
            false;

        // ─────────────────────────────────────
        // CREDS
        // ─────────────────────────────────────

        subSock.ev.on(
            "creds.update",
            async creds => {

                try {

                    await saveCreds(
                        creds
                    );

                } catch (err) {

                    console.error(
                        `${LOG} saveCreds error +${clean}:`,
                        err.message
                    );
                }
            }
        );

        // ─────────────────────────────────────
        // PAIRING
        // ─────────────────────────────────────

        let pairingRequested =
            false;

        const requestPairing =
            async () => {

                if (
                    pairingRequested
                ) {
                    return;
                }

                if (
                    state.creds.registered
                ) {
                    return;
                }

                if (
                    !mainSock ||
                    !requestJid
                ) {
                    return;
                }

                // Make sure this is still the
                // current socket.
                if (
                    global.subBots[clean] !==
                    subSock
                ) {
                    return;
                }

                pairingRequested =
                    true;

                try {

                    console.log(
                        `${LOG} Requesting pairing code for +${clean}`
                    );

                    try {

                        await mainSock.sendMessage(
                            requestJid,
                            {
                                text:
                                    `🔐 Requesting pairing code for +${clean}...`
                            },
                            requestMsg
                                ? {
                                    quoted:
                                        requestMsg
                                }
                                : {}
                        );

                    } catch {}

                    await sleep(
                        1000
                    );

                    let code =
                        await subSock.requestPairingCode(
                            clean
                        );

                    if (code) {

                        code =
                            String(code)
                                .match(
                                    /.{1,4}/g
                                )
                                ?.join("-") ||
                            code;
                    }

                    console.log(
                        `${LOG} Pairing code for +${clean}: ${code}`
                    );

                    try {

                        await mainSock.sendMessage(
                            requestJid,
                            {
                                text:
                                    `🔑 Pairing code for +${clean}:\n\n${code}`
                            }
                        );

                    } catch {}

                } catch (err) {

                    console.error(
                        `${LOG} Pairing error +${clean}:`,
                        err.message
                    );

                    pairingRequested =
                        false;

                    try {

                        await mainSock.sendMessage(
                            requestJid,
                            {
                                text:
                                    `❌ Pairing failed for +${clean}.\n\nPlease try again.`
                            },
                            requestMsg
                                ? {
                                    quoted:
                                        requestMsg
                                }
                                : {}
                        );

                    } catch {}
                }
            };

        // ─────────────────────────────────────
        // CONNECTION UPDATE
        // ─────────────────────────────────────

        subSock.ev.on(
            "connection.update",
            async update => {

                try {

                    const {
                        connection,
                        lastDisconnect
                    } = update;

                    // ─────────────────────────
                    // CONNECTED
                    // ─────────────────────────

                    if (
                        connection === "open"
                    ) {

                        // Ignore stale socket.
                        if (
                            global.subBotGeneration[
                                clean
                            ] !== generation
                        ) {
                            return;
                        }

                        console.log(
                            `${LOG} +${clean} connected successfully.`
                        );

                        global.subBots[clean] =
                            subSock;

                        global.subBotStarting[
                            clean
                        ] = false;

                        global.subBotLocks[
                            clean
                        ] = false;

                        clearReconnectTimer(
                            clean
                        );

                        if (
                            mainSock &&
                            requestJid
                        ) {

                            try {

                                await mainSock.sendMessage(
                                    requestJid,
                                    {
                                        text:
                                            `✅ Subbot +${clean} connected successfully.`
                                    }
                                );

                            } catch {}
                        }

                        return;
                    }

                    // ─────────────────────────
                    // DISCONNECTED
                    // ─────────────────────────

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
                            `${LOG} +${clean} disconnected. Reason: ${statusCode || "unknown"}`
                        );

                        // Only remove this exact socket.
                        if (
                            global.subBots[clean] ===
                            subSock
                        ) {

                            delete global.subBots[
                                clean
                            ];
                        }

                        global.subBotStarting[
                            clean
                        ] = false;

                        global.subBotLocks[
                            clean
                        ] = false;

                        // ─────────────────────
                        // LOGGED OUT
                        // ─────────────────────

                        if (loggedOut) {

                            console.log(
                                `${LOG} +${clean} logged out. Removing session.`
                            );

                            clearReconnectTimer(
                                clean
                            );

                            deleteSession(
                                sessionPath
                            );

                            if (
                                mainSock &&
                                requestJid
                            ) {

                                try {

                                    await mainSock.sendMessage(
                                        requestJid,
                                        {
                                            text:
                                                `🚪 Subbot +${clean} logged out.`
                                        }
                                    );

                                } catch {}
                            }

                            return;
                        }

                        // ─────────────────────
                        // NORMAL DISCONNECT
                        // ─────────────────────

                        // Only the latest socket can
                        // schedule a reconnect.
                        if (
                            global.subBotGeneration[
                                clean
                            ] !== generation
                        ) {
                            return;
                        }

                        scheduleReconnect(
                            clean
                        );
                    }

                } catch (err) {

                    console.error(
                        `${LOG} Connection handler error +${clean}:`,
                        err.message
                    );
                }
            }
        );

        // ─────────────────────────────────────
        // PAIRING TIMER
        // ─────────────────────────────────────

        if (
            !state.creds.registered &&
            mainSock &&
            requestJid
        ) {

            setTimeout(
                () => {

                    requestPairing()
                        .catch(() => {});

                },
                PAIRING_DELAY
            );
        }

        // ─────────────────────────────────────
        // CALL REJECT
        // ─────────────────────────────────────

        subSock.ev.on(
            "call",
            async calls => {

                try {

                    const config =
                        getSettings(
                            clean
                        );

                    if (
                        !config?.callReject
                    ) {
                        return;
                    }

                    for (
                        const call of
                        calls || []
                    ) {

                        if (
                            call.status !==
                            "offer"
                        ) {
                            continue;
                        }

                        try {

                            await subSock.rejectCall(
                                call.id,
                                call.from
                            );

                            await subSock.sendMessage(
                                call.from,
                                {
                                    text:
                                        "📵 Calls are not allowed on this bot."
                                }
                            );

                        } catch (err) {

                            console.error(
                                `${LOG} Call reject error +${clean}:`,
                                err.message
                            );
                        }
                    }

                } catch (err) {

                    console.error(
                        `${LOG} Call handler error +${clean}:`,
                        err.message
                    );
                }
            }
        );

        // ─────────────────────────────────────
        // MESSAGE HANDLER
        // ─────────────────────────────────────

        subSock.ev.on(
            "messages.upsert",
            async ({
                messages
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
                        const subMsg of
                        messages
                    ) {

                        try {

                            await handleSubMessage(
                                subSock,
                                subMsg,
                                clean
                            );

                        } catch (err) {

                            console.error(
                                `${LOG} Individual message error +${clean}:`,
                                err.message
                            );
                        }
                    }

                } catch (err) {

                    console.error(
                        `${LOG} Message handler error +${clean}:`,
                        err.message
                    );
                }
            }
        );

        // ─────────────────────────────────────
        // MENTIONME
        // ─────────────────────────────────────

        try {

            const mentionMe =
                require(
                    "../plugins/mentionme.js"
                );

            if (
                mentionMe &&
                typeof mentionMe.initMentionMe ===
                    "function"
            ) {

                mentionMe.initMentionMe(
                    subSock
                );
            }

        } catch (err) {

            console.error(
                `${LOG} mentionme error:`,
                err.message
            );
        }

        // ─────────────────────────────────────
        // ANTIPROMOTE
        // ─────────────────────────────────────

        try {

            const antiPromote =
                require(
                    "../plugins/antipromote.js"
                );

            if (
                antiPromote &&
                typeof antiPromote.initAntiPromote ===
                    "function"
            ) {

                antiPromote.initAntiPromote(
                    subSock
                );
            }

        } catch (err) {

            console.error(
                `${LOG} antipromote error:`,
                err.message
            );
        }

        return subSock;

    } catch (err) {

        console.error(
            `${LOG} Failed to start +${clean}:`,
            err.message
        );

        global.subBotStarting[
            clean
        ] = false;

        global.subBotLocks[
            clean
        ] = false;

        if (
            global.subBots[clean] ===
            subSock
        ) {

            delete global.subBots[
                clean
            ];
        }

        // If this was an unexpected startup
        // failure, retry automatically.
        if (
            subSock &&
            global.subBotGeneration[
                clean
            ] ===
            global.subBotGeneration[
                clean
            ]
        ) {

            scheduleReconnect(
                clean
            );
        }

        return null;
    }
}

// ─────────────────────────────────────────────
// MESSAGE PROCESSOR
// ─────────────────────────────────────────────

async function handleSubMessage(
    sock,
    msg,
    cleanNumber
) {

    try {

        if (!msg?.message) {
            return;
        }

        if (!msg.key?.remoteJid) {
            return;
        }

        if (
            isReactionOrProtocol(
                msg.message
            )
        ) {
            return;
        }

        storeMessage(msg);

        const jid =
            msg.key.remoteJid;

        // ─────────────────────────────────────
        // STATUS
        // ─────────────────────────────────────

        if (
            jid === "status@broadcast"
        ) {

            const config =
                getSettings(
                    cleanNumber
                );

            if (
                config?.autoStatusView
            ) {

                try {

                    await sock.readMessages([
                        msg.key
                    ]);

                } catch {}
            }

            return;
        }

        // ─────────────────────────────────────
        // TEXT
        // ─────────────────────────────────────

        const text =
            getMessageText(
                msg.message
            ).trim();

        const prefix =
            process.env.PREFIX || ".";

        if (!text) {
            return;
        }

        // Ignore normal messages sent by
        // the bot itself.
        if (
            msg.key.fromMe &&
            !text.startsWith(prefix)
        ) {
            return;
        }

        const isGroup =
            isGroupJid(jid);

        const config =
            getSettings(
                cleanNumber
            ) || {};

        // ─────────────────────────────────────
        // SENDER
        // ─────────────────────────────────────

        const senderRaw =
            msg.key.fromMe
                ? sock.user?.id
                : (
                    msg.key.participant ||
                    msg.participant ||
                    jid
                );

        const sender =
            normalizeJid(
                senderRaw
            );

        const subOwner =
            `${cleanNumber}@s.whatsapp.net`;

        const globalOwner =
            normalizeJid(
                global.ownerNumber
            );

        const sudoUsers =
            loadSudoUsers();

        const isSudo =
            !!(
                global.sudoUsers?.includes(
                    sender
                ) ||
                sudoUsers.includes(
                    sender
                )
            );

        const isSubOwner =
            sender === subOwner ||
            sender === globalOwner ||
            isSudo;

        // ─────────────────────────────────────
        // PRIVATE MODE
        // ─────────────────────────────────────

        if (
            config.botMode === "private" &&
            !isSubOwner
        ) {
            return;
        }

        // ─────────────────────────────────────
        // AUTO READ
        // ─────────────────────────────────────

        if (
            config.autoRead &&
            !msg.key.fromMe
        ) {

            sock.readMessages([
                msg.key
            ]).catch(() => {});
        }

        // ─────────────────────────────────────
        // AUTO REACT
        // ─────────────────────────────────────

        if (
            config.autoReact &&
            !msg.key.fromMe &&
            msg.key.id &&
            !msg.key.id.startsWith("BAE5")
        ) {

            const emojis = [
                "❤️",
                "🔥",
                "😂",
                "👍",
                "✨",
                "💯",
                "🎉",
                "😎"
            ];

            const emoji =
                emojis[
                    Math.floor(
                        Math.random() *
                        emojis.length
                    )
                ];

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

        // ─────────────────────────────────────
        // ANTILINK
        // ─────────────────────────────────────

        if (
            isGroup &&
            config.antilinkChats?.includes(
                jid
            ) &&
            !isSubOwner
        ) {

            const linkRegex =
                /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

            if (
                linkRegex.test(text)
            ) {

                const handled =
                    await handleAntiLink(
                        sock,
                        msg,
                        jid,
                        sender,
                        config
                    );

                if (handled) {
                    return;
                }
            }
        }

        // ─────────────────────────────────────
        // AUTO DOWNLOAD
        // ─────────────────────────────────────

        const autoDlEnabled =
            config.autoDlChats?.includes(
                jid
            ) ||
            (
                config.autoDlAllGroups &&
                isGroup
            ) ||
            (
                config.autoDlAllDms &&
                !isGroup
            );

        if (
            autoDlEnabled &&
            !text.startsWith(prefix)
        ) {

            const handled =
                await handleAutoDownload(
                    sock,
                    msg,
                    text,
                    isSubOwner
                );

            if (handled) {
                return;
            }
        }

        // ─────────────────────────────────────
        // COMMAND PARSER
        // ─────────────────────────────────────

        const hasPrefix =
            text.startsWith(prefix);

        if (
            !hasPrefix &&
            !config.withoutHandler
        ) {
            return;
        }

        const commandText =
            hasPrefix
                ? text
                    .slice(prefix.length)
                    .trim()
                : text.trim();

        if (!commandText) {
            return;
        }

        const args =
            commandText.split(
                /\s+/
            );

        const commandName =
            args.shift()
                ?.toLowerCase();

        if (!commandName) {
            return;
        }

        const command =
            getCommand(
                commandName
            );

        if (!command) {
            return;
        }

        // ─────────────────────────────────────
        // OWNER COMMAND
        // ─────────────────────────────────────

        if (
            command.category === "owner" &&
            !isSubOwner
        ) {

            await sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Owner only!"
                },
                {
                    quoted: msg
                }
            );

            return;
        }

        // ─────────────────────────────────────
        // EXECUTE
        // ─────────────────────────────────────

        if (
            typeof command.execute !==
            "function"
        ) {
            return;
        }

        try {

            await command.execute(
                sock,
                msg,
                args,
                isSubOwner
            );

        } catch (err) {

            console.error(
                `${LOG} Command ${commandName} error +${cleanNumber}:`,
                err.message
            );

            try {

                await sock.sendMessage(
                    jid,
                    {
                        text:
                            `❌ Command failed: ${commandName}`
                    },
                    {
                        quoted: msg
                    }
                );

            } catch {}
        }

    } catch (err) {

        console.error(
            `${LOG} Message processing error:`,
            err.message
        );
    }
}

// ─────────────────────────────────────────────
// ANTILINK
// ─────────────────────────────────────────────

async function handleAntiLink(
    sock,
    msg,
    jid,
    sender,
    config
) {

    try {

        const metadata =
            await sock.groupMetadata(
                jid
            );

        const realSender =
            msg.key.participant ||
            msg.participant ||
            sender;

        const member =
            metadata.participants.find(
                p =>
                    p.id === realSender ||
                    normalizeJid(p.id) ===
                        sender ||
                    p.id?.split("@")[0] ===
                        sender.split("@")[0]
            );

        const isAdmin =
            member?.admin === "admin" ||
            member?.admin ===
                "superadmin";

        // Admins are allowed.
        if (isAdmin) {
            return false;
        }

        const mode =
            config.antilinkMode?.[
                jid
            ] || "delete";

        // ─────────────────────────────────────
        // DELETE
        // ─────────────────────────────────────

        try {

            await sock.sendMessage(
                jid,
                {
                    delete: msg.key
                }
            );

        } catch {}

        // ─────────────────────────────────────
        // WARN
        // ─────────────────────────────────────

        if (
            mode === "warn"
        ) {

            await sock.sendMessage(
                jid,
                {
                    text:
                        `⚠️ @${sender.split("@")[0]}, WhatsApp group links are not allowed here.`,
                    mentions: [
                        sender
                    ]
                }
            );

            return true;
        }

        // ─────────────────────────────────────
        // KICK
        // ─────────────────────────────────────

        if (
            mode === "kick"
        ) {

            await sock.sendMessage(
                jid,
                {
                    text:
                        `🚫 @${sender.split("@")[0]} sent a group link.`,
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

                    } catch (err) {

                        console.error(
                            `${LOG} Kick failed:`,
                            err.message
                        );
                    }

                },
                1200
            );

            return true;
        }

        // Default delete.
        return true;

    } catch (err) {

        console.error(
            `${LOG} Antilink error:`,
            err.message
        );

        return false;
    }
}

// ─────────────────────────────────────────────
// AUTO DOWNLOAD
// ─────────────────────────────────────────────

async function handleAutoDownload(
    sock,
    msg,
    text,
    isSubOwner
) {

    try {

        if (
            !global.commands ||
            !Array.isArray(
                global.commands
            )
        ) {
            return false;
        }

        // ─────────────────────────────────────
        // INSTAGRAM
        // ─────────────────────────────────────

        if (
            /instagram\.com/i.test(
                text
            )
        ) {

            const command =
                getCommand(
                    "insta"
                );

            if (
                command &&
                typeof command.execute ===
                    "function"
            ) {

                await command.execute(
                    sock,
                    msg,
                    [text],
                    isSubOwner
                );

                return true;
            }
        }

        // ─────────────────────────────────────
        // FACEBOOK
        // ─────────────────────────────────────

        if (
            /facebook\.com|fb\.watch|fb\.gg/i.test(
                text
            )
        ) {

            const command =
                getCommand(
                    "fb"
                );

            if (
                command &&
                typeof command.execute ===
                    "function"
            ) {

                await command.execute(
                    sock,
                    msg,
                    [text],
                    isSubOwner
                );

                return true;
            }
        }

        // ─────────────────────────────────────
        // YOUTUBE
        // ─────────────────────────────────────

        if (
            /youtube\.com|youtu\.be/i.test(
                text
            )
        ) {

            const command =
                getCommand(
                    "ytv"
                );

            if (
                command &&
                typeof command.execute ===
                    "function"
            ) {

                await command.execute(
                    sock,
                    msg,
                    [text],
                    isSubOwner
                );

                return true;
            }
        }

        return false;

    } catch (err) {

        console.error(
            `${LOG} AutoDL error:`,
            err.message
        );

        return false;
    }
}

// ─────────────────────────────────────────────
// LOAD ALL SAVED SUBBOTS
// ─────────────────────────────────────────────

async function loadAllSubBots() {

    try {

        if (
            !fs.existsSync(
                SESSION_ROOT
            )
        ) {

            console.log(
                `${LOG} No subbot session directory found.`
            );

            return;
        }

        const folders =
            fs.readdirSync(
                SESSION_ROOT,
                {
                    withFileTypes: true
                }
            );

        const numbers =
            folders
                .filter(
                    entry =>
                        entry.isDirectory()
                )
                .map(
                    entry =>
                        cleanNumber(
                            entry.name
                        )
                )
                .filter(Boolean);

        if (
            !numbers.length
        ) {

            console.log(
                `${LOG} No saved subbots found.`
            );

            return;
        }

        console.log(
            `${LOG} Loading ${numbers.length} saved subbot(s)...`
        );

        for (
            const number of numbers
        ) {

            const sessionPath =
                getSessionPath(
                    number
                );

            const credsPath =
                path.join(
                    sessionPath,
                    "creds.json"
                );

            if (
                !fs.existsSync(
                    credsPath
                )
            ) {

                console.log(
                    `${LOG} Skipping +${number}: creds.json not found.`
                );

                continue;
            }

            try {

                await startSubBot(
                    number
                );

            } catch (err) {

                console.error(
                    `${LOG} Failed loading +${number}:`,
                    err.message
                );
            }

            // Small stagger to avoid
            // starting every socket at once.
            await sleep(700);
        }

        console.log(
            `${LOG} Saved subbots loading completed.`
        );

    } catch (err) {

        console.error(
            `${LOG} loadAllSubBots error:`,
            err.message
        );
    }
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

module.exports = {
    startSubBot,
    loadAllSubBots
};