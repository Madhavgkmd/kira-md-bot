const { downloadMediaMessage } = require("@whiskeysockets/baileys");

async function getBuffer(msg, type = "buffer") {

    const buffer = await downloadMediaMessage(
        msg,
        type,
        {},
        {
            logger: undefined,
            reuploadRequest: undefined
        }
    );

    return buffer;
}

module.exports = {
    getBuffer
};