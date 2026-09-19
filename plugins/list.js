module.exports = {
    name: "list",
    alias: ["cmds", "commands"],
    category: "main",
    description: "Show all commands",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const commands = global.commands || [];

        if (!commands.length) {
            return sock.sendMessage(
                jid,
                {
                    text: "❌ No commands loaded."
                },
                { quoted: msg }
            );
        }

        let text = `📜 *${global.config?.BOT_NAME || 'KIRA X MD'} COMMAND LIST*\n\n`;

        for (const cmd of commands) {
            const name = cmd.name || "Unknown";
            const desc =
                cmd.description ||
                "No description";

            text += `➤ .${name}\n`;
            text += `   ⤷ ${desc}\n\n`;
        }

        text += `📦 Total Commands: ${commands.length}`;

        await sock.sendMessage(
            jid,
            { text },
            { quoted: msg }
        );
    }
};