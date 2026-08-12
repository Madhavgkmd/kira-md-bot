// plugins/mentionme.js – KIRA X MD (Mention Triggered Audio)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { getSettings, updateSetting } = require('../lib/database'); // 🔥 ഡാറ്റാബേസ് ആഡ് ചെയ്തു!

const AUDIO_LIST = [
    "https://files.catbox.moe/ejvyvx.mp3",
    "https://files.catbox.moe/ljngz7.mp3",
    "https://files.catbox.moe/26prqz.mp3",
    "https://files.catbox.moe/4qvsjn.mp3",
    "https://files.catbox.moe/soitwx.mp3",
    "https://files.catbox.moe/kwr8xu.mp3",
    "https://files.catbox.moe/gzgbh1.mp3"
];

module.exports = {
    name: 'mentionme',
    alias: ['maudio', 'tagaudio'],
    category: 'owner',
    description: 'Toggle auto-audio reply when YOU are mentioned',
    usage: `.mentionme on/off`,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!isOwner) {
            return await sock.sendMessage(jid, { text: '❌ *Only the bot owner can use this!*' }, { quoted: msg });
        }

        const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        const config = getSettings(botNumber);
        const action = args && args[0] ? args[0].toLowerCase() : '';

        if (action === 'on') {
            updateSetting(botNumber, "mentionMe", true);
            await sock.sendMessage(jid, { text: '✅ *Mention Auto-Reply Activated (For this bot)!*' }, { quoted: msg });
        } else if (action === 'off') {
            updateSetting(botNumber, "mentionMe", false);
            await sock.sendMessage(jid, { text: '❌ *Mention Auto-Reply Deactivated (For this bot)!*' }, { quoted: msg });
        } else {
            const status = config.mentionMe ? '🟢 ON' : '🔴 OFF';
            await sock.sendMessage(jid, {
                text: `🎵 *MENTION SETTINGS*\n\n➤ .mentionme on\n➤ .mentionme off\n\n*Status:* ${status}`
            }, { quoted: msg });
        }
    }
};

async function initMentionMe(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
            const config = getSettings(botNumber);
            
            // 🔥 ആ ബോട്ടിന് പ്രത്യേകം ഓൺ ആണോ എന്ന് ചെക്ക് ചെയ്യുന്നു
            if (!config.mentionMe) return;

            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');
            if (!isGroup) return;

            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const prefix = process.env.PREFIX || '.';
            if (text.trim().startsWith(prefix)) return;
            if (msg.key.fromMe) return;

            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const repliedTo = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
            const lowerText = text.toLowerCase();

            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const botJidLid = sock.user.id.split(':')[0] + '@lid';
            const botPhone = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');

            let isMentioned = false;

            if (mentionedJid.includes(botJid) || mentionedJid.includes(botJidLid)) isMentioned = true;
            if (repliedTo === botJid || repliedTo === botJidLid) isMentioned = true;
            if (lowerText.includes('@all') || lowerText.includes(`@${botPhone}`)) isMentioned = true;

            const botDisplayName = sock.user.name || sock.user.verifiedName || '';
            if (botDisplayName && lowerText.includes(botDisplayName.toLowerCase())) isMentioned = true;

            if (!isMentioned) return;

            console.log(`🎤 +${botPhone} was mentioned! Sending audio...`);

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

            } catch (err) {
                console.error('❌ Audio error:', err.message);
            } finally {
                try {
                    if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
                    if (fs.existsSync(tempOgg)) fs.unlinkSync(tempOgg);
                } catch (e) {}
            }
        } catch (err) {}
    });
}

module.exports.initMentionMe = initMentionMe;