// plugins/pp.js - KIRA X MD
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
    name: "pp",
    alias: ["setpp", "profilepic"],
    category: "owner",
    description: "Set bot profile picture by replying to an image",
    usage: ".pp",

    async execute(sock, msg, args, isOwner) {

        const jid = msg.key.remoteJid;

        // Owner only
        if (!isOwner) {
            return await sock.sendMessage(
                jid,
                { text: "❌ *Owner only command!*" },
                { quoted: msg }
            );
        }

        // Get quoted message
        const context =
            msg.message?.extendedTextMessage?.contextInfo;

        if (!context?.quotedMessage) {
            return await sock.sendMessage(
                jid,
                { text: "❌ *Reply to an image!*" },
                { quoted: msg }
            );
        }

        let quoted = context.quotedMessage;

        // Handle view-once images
        if (quoted.viewOnceMessageV2?.message) {
            quoted = quoted.viewOnceMessageV2.message;
        } else if (quoted.viewOnceMessage?.message) {
            quoted = quoted.viewOnceMessage.message;
        }

        // Check image
        if (!quoted.imageMessage) {
            return await sock.sendMessage(
                jid,
                { text: "❌ *The replied message is not an image!*" },
                { quoted: msg }
            );
        }

        let tempPath = null;

        try {

            await sock.sendMessage(
                jid,
                { react: { text: "⏳", key: msg.key } }
            );

            // Download quoted image
            const buffer = await downloadMediaMessage(
                {
                    message: quoted
                },
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            if (!buffer || !buffer.length) {
                throw new Error("Image download failed");
            }

            // Temporary file
            tempPath = path.join(
                process.cwd(),
                `pp_${Date.now()}.jpg`
            );

            fs.writeFileSync(tempPath, buffer);

            // Bot JID
            const botJid = sock.user.id;

            // Update profile picture
            await sock.updateProfilePicture(
                botJid,
                buffer
            );

            await sock.sendMessage(
                jid,
                {
                    text: "✅ *Profile Picture Updated!*"
                },
                { quoted: msg }
            );

            await sock.sendMessage(
                jid,
                { react: { text: "✅", key: msg.key } }
            );

        } catch (error) {

            console.error("PP ERROR:", error);

            await sock.sendMessage(
                jid,
                { react: { text: "❌", key: msg.key } }
            );

            await sock.sendMessage(
                jid,
                {
                    text:
`❌ *Failed to update profile picture!*

${error.message}`
                },
                { quoted: msg }
            );

        } finally {

            // Delete temp file
            try {
                if (tempPath && fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            } catch (e) {}
        }
    }
};