const axios = require("axios");

module.exports = {
    name: "sms",
    category: "tools",
    description: "Send SMS",
    usage: ".sms <number> <message>",

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(
                jid,
                { text: "❌ Owner only!" },
                { quoted: msg }
            );
        }

        const number = args[0];
        const message =
            args.slice(1).join(" ");

        if (!number || !message) {
            return sock.sendMessage(
                jid,
                {
                    text:
`❌ Example:
.sms 9633902730 Hello Bro`
                },
                { quoted: msg }
            );
        }

        try {
            const api =
                `https://jerrycoder.oggyapi.workers.dev/tool/sms?number=${encodeURIComponent(number)}&message=${encodeURIComponent(message)}`;

            const { data } =
                await axios.get(api);

            await sock.sendMessage(
                jid,
                {
                    text:
`✅ SMS Sent

📱 Number: ${number}
💬 Message: ${message}`
                },
                { quoted: msg }
            );

        } catch {
            await sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Failed to send SMS"
                },
                { quoted: msg }
            );
        }
    }
};