// plugins/mentionme.js – KIRA X MD
// Trigger: @all + individual bot mention
// Direct reply: DISABLED

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { getSettings, updateSetting } = require('../lib/database');

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
    description: 'Toggle audio when bot is mentioned',
    usage: `.mentionme on/off`,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        if (!isOwner) {
            return await sock.sendMessage(
                jid,
                { text: '❌ *Owner only command!*' },
                { quoted: msg }
            );
        }

        const botNumber = sock.user.id
            .split(':')[0]
            .replace(/[^0-9]/g, '');

        const config = getSettings(botNumber);
        const action = (args?.[0] || '').toLowerCase();

        if (action === 'on') {
            updateSetting(botNumber, 'mentionMe', true);

            return await sock.sendMessage(
                jid,
                { text: '✅ *Mention Audio ON*' },
                { quoted: msg }
            );
        }

        if (action === 'off') {
            updateSetting(botNumber, 'mentionMe', false);

            return await sock.sendMessage(
                jid,
                { text: '❌ *Mention Audio OFF*' },
                { quoted: msg }
            );
        }

        const status = config.mentionMe ? '🟢 ON' : '🔴 OFF';

        return await sock.sendMessage(
            jid,
            {
                text:
`🎤 *MENTION AUDIO*

➤ .mentionme on
➤ .mentionme off

Status: ${status}

_Triggers only when the bot is personally mentioned or @all is used._`
            },
            { quoted: msg }
        );
    }
};


// ─────────────────────────────────────────────
// 🎤 MENTION AUDIO EVENT
// ─────────────────────────────────────────────

async function initMentionMe(sock) {

    sock.ev.on('messages.upsert', async ({ messages }) => {

        try {
            const msg = messages?.[0];

            if (!msg?.message) return;
            if (msg.key?.fromMe) return;

            const jid = msg.key.remoteJid;

            // Group only
            if (!jid || !jid.endsWith('@g.us')) return;

            const botNumber = sock.user.id
                .split(':')[0]
                .replace(/[^0-9]/g, '');

            const config = getSettings(botNumber);

            // Feature OFF
            if (!config.mentionMe) return;

            // Ignore commands
            const text =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                '';

            const prefix = process.env.PREFIX || '.';

            if (text.trim().startsWith(prefix)) return;


            // ─────────────────────────────────────
            // BOT JID
            // ─────────────────────────────────────

            const botJid = `${botNumber}@s.whatsapp.net`;
            const botLid = `${botNumber}@lid`;


            // ─────────────────────────────────────
            // GET MENTIONS
            // ─────────────────────────────────────

            const contextInfo =
                msg.message?.extendedTextMessage?.contextInfo ||
                msg.message?.imageMessage?.contextInfo ||
                msg.message?.videoMessage?.contextInfo ||
                msg.message?.documentMessage?.contextInfo ||
                {};

            const mentionedJid =
                contextInfo.mentionedJid || [];


            // ─────────────────────────────────────
            // 🔥 INDIVIDUAL BOT MENTION
            // ─────────────────────────────────────

            let isBotMentioned = false;

            for (const mentioned of mentionedJid) {

                if (
                    mentioned === botJid ||
                    mentioned === botLid
                ) {
                    isBotMentioned = true;
                    break;
                }

                const mentionedNumber = mentioned
                    .split('@')[0]
                    .replace(/[^0-9]/g, '');

                if (mentionedNumber === botNumber) {
                    isBotMentioned = true;
                    break;
                }
            }


            // ─────────────────────────────────────
            // 🔥 @ALL DETECTION
            // ─────────────────────────────────────

            const lowerText = text.toLowerCase();

            const isAllMention =
                lowerText.includes('@all') ||
                lowerText.includes('@everyone');


            // ─────────────────────────────────────
            // ❌ DIRECT REPLY DISABLED
            // ─────────────────────────────────────

            // contextInfo.participant intentionally NOT checked.
            // So replying directly to bot will NOT trigger audio.


            // ─────────────────────────────────────
            // NOTHING MATCHED
            // ─────────────────────────────────────

            if (!isBotMentioned && !isAllMention) return;


            console.log(
                `🎤 Mention detected for +${botNumber}`
            );


            // ─────────────────────────────────────
            // RANDOM AUDIO
            // ─────────────────────────────────────

            const randomAudioUrl =
                AUDIO_LIST[
                    Math.floor(Math.random() * AUDIO_LIST.length)
                ];


            await sock.sendPresenceUpdate(
                'recording',
                jid
            );


            const timestamp = Date.now();

            const tempMp3 = path.join(
                process.cwd(),
                `mention_${timestamp}.mp3`
            );

            const tempOgg = path.join(
                process.cwd(),
                `mention_${timestamp}.ogg`
            );


            try {

                // Download MP3
                const audioRes = await axios.get(
                    randomAudioUrl,
                    {
                        responseType: 'arraybuffer',
                        timeout: 30000
                    }
                );

                fs.writeFileSync(
                    tempMp3,
                    Buffer.from(audioRes.data)
                );


                // Convert MP3 → OGG/OPUS
                const ffmpegCmd =
                    `ffmpeg -y -i "${tempMp3}" ` +
                    `-c:a libopus ` +
                    `-b:a 48k ` +
                    `-vbr on ` +
                    `-compression_level 10 ` +
                    `-frame_duration 20 ` +
                    `-application voip ` +
                    `"${tempOgg}"`;


                await new Promise((resolve, reject) => {

                    exec(
                        ffmpegCmd,
                        (error, stdout, stderr) => {

                            if (error) {
                                console.error(
                                    'FFmpeg error:',
                                    stderr || error.message
                                );

                                return reject(error);
                            }

                            resolve();
                        }
                    );

                });


                // Read converted audio
                const audioBuffer =
                    fs.readFileSync(tempOgg);


                // Send voice note
                await sock.sendMessage(
                    jid,
                    {
                        audio: audioBuffer,
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: true
                    },
                    { quoted: msg }
                );


            } catch (error) {

                console.error(
                    '❌ Mention audio error:',
                    error.message
                );

            } finally {

                // Cleanup
                try {
                    if (fs.existsSync(tempMp3)) {
                        fs.unlinkSync(tempMp3);
                    }

                    if (fs.existsSync(tempOgg)) {
                        fs.unlinkSync(tempOgg);
                    }
                } catch (cleanupError) {
                    console.error(
                        'Cleanup error:',
                        cleanupError.message
                    );
                }
            }


        } catch (error) {

            console.error(
                'MentionMe event error:',
                error.message
            );

        }
    });
}


module.exports.initMentionMe = initMentionMe;