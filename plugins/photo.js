const sharp = require("sharp");
const { getBuffer } = require("../lib/functions");

module.exports = {
    name: "photo",
    category: "sticker",
    desc: "Convert sticker to image",

    async execute(sock, msg) {

        const quoted =
            msg.message?.extendedTextMessage?.contextInfo;

        if (!quoted?.quotedMessage?.stickerMessage) {
            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: "❌ Please reply to a sticker."
                },
                { quoted: msg }
            );
        }

        try {
            const mediaMsg = {
                key: {
                    remoteJid: msg.key.remoteJid
                },
                message: quoted.quotedMessage
            };

            const buffer = await getBuffer(mediaMsg);

            const imageBuffer = await sharp(buffer)
                .png()
                .toBuffer();

            // ക്യാപ്ഷൻ ഒന്നുമില്ലാതെ ഇമേജ് മാത്രം അയക്കുന്നു
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    image: imageBuffer
                },
                { quoted: msg }
            );

        } catch (err) {
            console.log(err);

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: "❌ Conversion failed."
                },
                { quoted: msg }
            );
        }
    }
};