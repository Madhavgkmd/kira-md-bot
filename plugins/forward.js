const { downloadContentFromMessage, generateWAMessageFromContent, generateForwardMessageContent } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

function getTarget(s) {
    s = String(s || "").trim();
    if (s.includes("@g.us") || s.includes("@s.whatsapp.net") || s.includes("@newsletter")) return s;
    if (/^\d+$/.test(s)) return `${s}@s.whatsapp.net`;
    return null;
}

module.exports = {
    name: "forward",
    alias: ["fwd", "push"],
    category: "owner",
    description: "Channel Voice PAKKA FIX",
    usage: `${process.env.PREFIX || '.'}forward <JID>`,

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        if (!isOwner) return await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg });

        const target = getTarget(args.join(" "));
        if (!target) return await sock.sendMessage(jid, { text: "⚠️ *Invalid JID!*" }, { quoted: msg });

        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = ctx?.quotedMessage;
        if (!quotedMsg) return await sock.sendMessage(jid, { text: "⚠️ *Reply to a message to forward!*" }, { quoted: msg });

        await sock.sendMessage(jid, { react: { text: "🚀", key: msg.key } });

        try {
            const mime = Object.keys(quotedMsg)[0];

            if (mime === 'audioMessage') {
                const stream = await downloadContentFromMessage(quotedMsg[mime], 'audio');
                const tempDir = path.join(__dirname, "../temp");
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                const inputPath = path.join(tempDir, `in_${Date.now()}.tmp`);
                const outputPath = path.join(tempDir, `out_${Date.now()}.ogg`);

                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                fs.writeFileSync(inputPath, buffer);

                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .toFormat('ogg')
                        .audioCodec('libopus')
                        .audioBitrate('32k')
                        .audioChannels(1)
                        .audioFrequency(48000)
                        .save(outputPath)
                        .on('end', resolve)
                        .on('error', reject);
                });

                const outBuffer = fs.readFileSync(outputPath);
                
                // Pakka trick: waveform + seconds + upload manually
                const seconds = quotedMsg[mime].seconds || 10;
                const waveform = quotedMsg[mime].waveform || new Uint8Array(64).fill(0).map(() => Math.floor(Math.random()*100));

                // Upload first, then relay - itha main fix
                const uploaded = await sock.waUploadToServer(outBuffer, { mediaType: 'audio', fileEncSha256B64: '', mimetype: 'audio/ogg; codecs=opus' });

                const msgContent = {
                    audioMessage: {
                        url: uploaded.url,
                        mimetype: 'audio/ogg; codecs=opus',
                        fileSha256: uploaded.fileSha256,
                        fileEncSha256: uploaded.fileEncSha256,
                        mediaKey: uploaded.mediaKey,
                        fileLength: outBuffer.length,
                        seconds: seconds,
                        ptt: true,
                        waveform: waveform,
                        directPath: uploaded.directPath
                    }
                };

                const waMsg = generateWAMessageFromContent(target, msgContent, { userJid: sock.user.id });
                await sock.relayMessage(target, waMsg.message, { messageId: waMsg.key.id });

                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

                console.log("✅ RELAY SUCCESS TO:", target);
            } else {
                // Text/image/video ok - native forward use cheyyam
                const fakeOriginalMsg = {
                    key: {
                        remoteJid: jid,
                        id: ctx.stanzaId,
                        participant: ctx.participant || jid,
                        fromMe: false 
                    },
                    message: quotedMsg
                };
                await sock.sendMessage(target, { forward: fakeOriginalMsg });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error("❌ FATAL ERROR:", error);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: `Error: ${error.message}` }, { quoted: msg });
        }
    }
};