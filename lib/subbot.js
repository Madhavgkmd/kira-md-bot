const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

global.subBots = global.subBots || {}; 
global.subBotLocks = global.subBotLocks || {}; 
global.subBotModes = global.subBotModes || {}; 

function deleteSession(sessionPath) {
    try {
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`🗑️ [AUTO-CLEAN] Dead session folder deleted automatically!`);
        }
    } catch (e) {}
}

async function startSubBot(phoneNumber, mainSock = null, jid = null, msg = null) {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

    if (global.subBotLocks[cleanNumber]) return; 
    global.subBotLocks[cleanNumber] = true; 

    const sessionPath = path.join(process.cwd(), `subbot_sessions/${cleanNumber}`);
    const isNewSession = !fs.existsSync(sessionPath); 
    
    if (isNewSession) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const subSock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), 
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        syncFullHistory: false, 
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: false, 
        connectTimeoutMs: 60000, 
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000
    });

    global.subBots[cleanNumber] = subSock;
    global.subBotLocks[cleanNumber] = false; 

    subSock.ev.on("creds.update", saveCreds);

    if (!state.creds.registered && mainSock && jid) {
        setTimeout(async () => {
            try {
                let code = await subSock.requestPairingCode(cleanNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                await mainSock.sendMessage(jid, { 
                    text: `✅ *P A I R I N G  C O D E  G E N E R A T E D*\n\n_Copy the code below and paste it in WhatsApp -> Linked Devices._\n_Your bot will start immediately after linking! 🚀_\n\n> *KIRA X MD*` 
                }, { quoted: msg });

                await mainSock.sendMessage(jid, { text: code });

            } catch (error) {
                mainSock.sendMessage(jid, { text: `❌ *Error:* WhatsApp Rate Limit Hit! Please wait 5 to 10 minutes before generating a new code.` }, { quoted: msg });
                deleteSession(sessionPath); 
            }
        }, 3000);
    }

    subSock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(`✅ [JADIBOT] +${cleanNumber} Connected!`);
            
            if (isNewSession) {
                setTimeout(async () => {
                    try {
                        await subSock.groupAcceptInvite("F6T2dlCuTzV21x04GSs7Bs");
                        console.log(`📌 [JADIBOT] +${cleanNumber} joined the official Group!`);
                    } catch (e) {}

                    try {
                        const channelMetadata = await subSock.newsletterMetadata("invite", "0029Vb87dNXATRSs169S8c1t");
                        if (channelMetadata && channelMetadata.id) {
                            await subSock.newsletterFollow(channelMetadata.id);
                            console.log(`📌 [JADIBOT] +${cleanNumber} followed the official Channel!`);
                        }
                    } catch (e) {}
                }, 15000); 
            }

            if (mainSock && jid && isNewSession) {
                await mainSock.sendMessage(jid, { text: `🎉 *Success!* +${cleanNumber} is now running KIRA-X-MD!` }, { quoted: msg });
                try {
                    await subSock.sendMessage(cleanNumber + "@s.whatsapp.net", { 
                        text: `╭━━━〔 KIRA-X-MD (Jadibot) 〕━━━⬣\n\n✅ Connected Successfully\n\n👤 Sub-Owner : +${cleanNumber}\n🤖 Bot : KIRA-X-MD\n🌐 Powered by : KIRA\n\n_Type .menu to see all commands!_\n╰━━━━━━━━━━━━━━⬣` 
                    });
                } catch (err) {}
            }
        } else if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            
            const isLoggedOut = reason === DisconnectReason.loggedOut || 
                                reason === 401 || 
                                reason === 403;

            if (isLoggedOut) {
                console.log(`❌ [JADIBOT] +${cleanNumber} disconnected permanently. Auto-deleting session...`);
                deleteSession(sessionPath);
                delete global.subBots[cleanNumber];
                
                try { subSock.ws.close(); } catch(e) {} 
                return; 
                
            } else {
                if (!global.subBotLocks[cleanNumber]) {
                    console.log(`⚠️ Network issue for +${cleanNumber}... Reconnecting in 5s...`);
                    global.subBotLocks[cleanNumber] = true;
                    setTimeout(() => {
                        global.subBotLocks[cleanNumber] = false;
                        startSubBot(cleanNumber);
                    }, 5000);
                }
            }
        }
    });

    subSock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const subMsg = messages[0];
            if (!subMsg || !subMsg.message) return;

            const subJid = subMsg.key.remoteJid;
            
            if (subJid === 'status@broadcast') return;

            const subSender = subMsg.key.fromMe ? subSock.user.id.split(':')[0] + "@s.whatsapp.net" : (subMsg.participant || subJid);
            const text = subMsg.message.conversation || subMsg.message.extendedTextMessage?.text || "";
            const prefix = process.env.PREFIX || '.';
            
            if (!text.startsWith(prefix)) return;

            const isSubOwner = subSender === (cleanNumber + "@s.whatsapp.net") || subSender === global.ownerNumber;
            
            const rawCommand = text.slice(prefix.length).trim().toLowerCase();
            if (rawCommand === 'mode private') {
                if (!isSubOwner) return await subSock.sendMessage(subJid, { text: '❌ *Only the owner can change the mode!*' }, { quoted: subMsg });
                global.subBotModes[cleanNumber] = 'private';
                return await subSock.sendMessage(subJid, { text: '✅ *Bot mode switched to PRIVATE*\nOnly you can use commands now.' }, { quoted: subMsg });
            }
            if (rawCommand === 'mode public') {
                if (!isSubOwner) return await subSock.sendMessage(subJid, { text: '❌ *Only the owner can change the mode!*' }, { quoted: subMsg });
                global.subBotModes[cleanNumber] = 'public';
                return await subSock.sendMessage(subJid, { text: '✅ *Bot mode switched to PUBLIC*\nAnyone can use commands.' }, { quoted: subMsg });
            }

            const currentMode = global.subBotModes[cleanNumber] || 'public';
            if (currentMode === 'private' && !isSubOwner) return;

            const subArgs = text.slice(prefix.length).trim().split(/ +/);
            const commandName = subArgs.shift().toLowerCase();
            
            if (global.commands) {
                const command = global.commands.find(cmd => cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName)));
                if (command) {
                    // 🔥 Typing ഫീച്ചർ എടുത്തു കളഞ്ഞു! ഡയറക്റ്റ് ആയിട്ട് കമാൻഡ് വർക്ക് ആവും.
                    await command.execute(subSock, subMsg, subArgs, isSubOwner);
                }
            }
        } catch (err) {}
    });
}

async function loadAllSubBots() {
    const clonesPath = path.join(process.cwd(), 'subbot_sessions');
    if (!fs.existsSync(clonesPath)) return;

    const folders = fs.readdirSync(clonesPath);
    for (const num of folders) {
        if (fs.existsSync(path.join(clonesPath, num, 'creds.json'))) {
            console.log(`🔄 Starting sub-bot +${num}...`);
            await startSubBot(num);
        }
    }
}

module.exports = { startSubBot, loadAllSubBots };