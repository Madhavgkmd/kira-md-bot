// plugins/mentionme.js – KIRA X MD (Mention Triggered Audio)
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

// ─── Audio URLs (replace with your own) ──────────────────
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
    description: 'Toggle auto-audio reply when YOU are mentioned',
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

// ─── Background listener ──────────────────────────────
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
            const prefix = process.env.PREFIX || '.';
            if (text.trim().startsWith(prefix)) return;
            if (msg.key.fromMe) return;

            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const repliedTo = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
            const lowerText = text.toLowerCase();

            // ─── Get bot/owner details ──────────────────
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const botJidLid = sock.user.id.split(':')[0] + '@lid';
            const botPhone = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');

            let isMentioned = false;

            // 1. Standard WhatsApp mention (JID in mentionedJid)
            if (mentionedJid.includes(botJid) || mentionedJid.includes(botJidLid)) {
                isMentioned = true;
            }

            // 2. Reply to bot's message
            if (repliedTo === botJid || repliedTo === botJidLid) {
                isMentioned = true;
            }

            // 3. Text contains @phone or @all
            if (lowerText.includes('@all') || lowerText.includes(`@${botPhone}`)) {
                isMentioned = true;
            }

            // 4. Also check bot's display name (in case it's different)
            const botDisplayName = sock.user.name || sock.user.verifiedName || '';
            if (botDisplayName && lowerText.includes(botDisplayName.toLowerCase())) {
                isMentioned = true;
            }

            if (!isMentioned) return;

            console.log('🎤 YOU were mentioned! Sending audio...');

            // ─── Send random audio ─────────────────────────
            const randomAudioUrl = AUDIO_LIST[Math.floor(Math.random() * AUDIO_LIST.length)];

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