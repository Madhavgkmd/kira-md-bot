// plugins/mentionme.js – KIRA X MD (Mention Triggered Media Reply)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');

const dbPath = path.join(__dirname, '../mentionme_db.json');

// ─── Database helpers ──────────────────────────────────
function getDB() {
    try {
        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf-8');
            if (data) return JSON.parse(data);
        }
    } catch (err) {}
    return { enabled: false };
}

function saveDB(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (err) {}
}

// ─── Audio list (your URLs) ────────────────────────────
const AUDIO_LIST = [
    "https://files.catbox.moe/ejvyvx.mp3",
    "https://files.catbox.moe/ljngz7.mp3",
    "https://files.catbox.moe/26prqz.mp3",
    "https://files.catbox.moe/4qvsjn.mp3",
    "https://files.catbox.moe/soitwx.mp3",
    "https://files.catbox.moe/kwr8xu.mp3",
    "https://files.catbox.moe/gzgbh1.mp3"
];

// ─── Plugin command ──────────────────────────────────────
module.exports = {
    name: 'mentionme',
    alias: ['maudio', 'tagaudio'],
    category: 'ai',
    description: 'Toggle auto-audio reply when bot is mentioned',
    usage: `${process.env.PREFIX || '.'}mentionme on/off`,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!isOwner) {
            await sock.sendMessage(jid, { text: '❌ *Only the bot owner can use this!*' }, { quoted: msg });
            return;
        }

        const action = args && args[0] ? args[0].toLowerCase() : '';
        let db = getDB();

        if (action === 'on') {
            db.enabled = true;
            saveDB(db);
            await sock.sendMessage(jid, { text: '✅ *Mention Auto-Reply Activated!*' }, { quoted: msg });
        } else if (action === 'off') {
            db.enabled = false;
            saveDB(db);
            await sock.sendMessage(jid, { text: '❌ *Mention Auto-Reply Deactivated!*' }, { quoted: msg });
        } else {
            const status = db.enabled ? '🟢 ON' : '🔴 OFF';
            await sock.sendMessage(jid, {
                text: `🎵 *MENTION SETTINGS*\n\n➤ ${process.env.PREFIX || '.'}mentionme on\n➤ ${process.env.PREFIX || '.'}mentionme off\n\n*Status:* ${status}`
            }, { quoted: msg });
        }
    }
};

// ─── Background listener (called from index.js) ────────
async function initMentionMe(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const db = getDB();
            if (!db.enabled) return;

            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');
            if (!isGroup) return;

            const text = msg.message?.conversation ||
                         msg.message?.extendedTextMessage?.text ||
                         '';
                         
            // സ്വന്തം മെസ്സേജുകൾക്കും കമാൻഡുകൾക്കും പാട്ട് പോകാതിരിക്കാൻ
            const isCommand = text.trim().startsWith(process.env.PREFIX || '.');
            if (isCommand || msg.key.fromMe || msg.message?.audioMessage) return;

            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const repliedTo = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
            const lowerText = text.toLowerCase();

            // ─── Get bot and owner details ──────────────────
            const botPhone = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
            const ownerPhone = global.ownerNumber ? global.ownerNumber.replace(/[^0-9]/g, '') : '';
            
            // 🔥 നിന്റെ കൃത്യമായ നമ്പർ ഇവിടെയുണ്ട്
            const myExactNumber = "917907199765"; 

            // ─── Check if mentioned ─────────────────────────
            let isMentioned = false;

            // 1. വാട്സാപ്പ് ഒറിജിനൽ ടാഗ് ലിസ്റ്റ് ചെക്ക് (നമ്പറുകൾ ഉണ്ടോ എന്ന്)
            if (mentionedJid.some(id => id.includes(botPhone) || (ownerPhone && id.includes(ownerPhone)) || id.includes(myExactNumber))) {
                isMentioned = true;
            }

            // 2. നിന്റെയോ ബോട്ടിന്റെയോ മെസ്സേജിന് റിപ്ലൈ അടിച്ചതാണോ എന്ന് നോക്കുന്നു
            if (repliedTo.includes(botPhone) || (ownerPhone && repliedTo.includes(ownerPhone)) || repliedTo.includes(myExactNumber)) {
                isMentioned = true;
            }

            // 3. പ്ലെയിൻ ടെക്സ്റ്റ് ടാഗ് (@all അല്ലെങ്കിൽ @നമ്പർ ടൈപ്പ് ചെയ്തത്)
            if (lowerText.includes('@all') || lowerText.includes(`@${botPhone}`) || (ownerPhone && lowerText.includes(`@${ownerPhone}`)) || lowerText.includes(`@${myExactNumber}`)) {
                isMentioned = true;
            }

            // 4. 🔥 നമ്മൾ മുമ്പ് ഉണ്ടാക്കിയ Pushname Bypass (ഇതാണ് നിനക്ക് ഇപ്പോൾ വർക്ക് ആവാത്തത്!)
            if (lowerText.includes('lucius') || lowerText.includes('castus') || lowerText.includes('@~')) {
                isMentioned = true;
            }

            if (!isMentioned) return;

            // ─── Reply with random audio ──────────────────
            console.log('🎤 Bot/Owner mentioned! Sending audio...');
            const randomAudioUrl = AUDIO_LIST[Math.floor(Math.random() * AUDIO_LIST.length)];

            // വാട്സാപ്പിൽ "Recording audio..." എന്ന് കാണിക്കാൻ
            await sock.sendPresenceUpdate('recording', jid);

            const tempMp3 = path.join(process.cwd(), `temp_${Date.now()}.mp3`);
            const tempOgg = path.join(process.cwd(), `temp_${Date.now()}.ogg`);

            try {
                const audioRes = await axios.get(randomAudioUrl, { responseType: 'arraybuffer' });
                fs.writeFileSync(tempMp3, Buffer.from(audioRes.data));

                const ffmpegCmd = `ffmpeg -i "${tempMp3}" -c:a libopus -b:a 48k -vbr on -compression_level 10 -frame_duration 20 -application voip "${tempOgg}" -y`;
                await new Promise((resolve, reject) => {
                    exec(ffmpegCmd, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                const audioBuffer = fs.readFileSync(tempOgg);
                await sock.sendMessage(jid, {
                    audio: audioBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                }, { quoted: msg });

                console.log('✅ Audio sent');
            } catch (err) {
                console.error('❌ Audio error:', err.message);
            } finally {
                try {
                    if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
                    if (fs.existsSync(tempOgg)) fs.unlinkSync(tempOgg);
                } catch (e) {}
            }

        } catch (err) {
            console.error('❌ Mention listener error:', err.message);
        }
    });
}

module.exports.initMentionMe = initMentionMe;