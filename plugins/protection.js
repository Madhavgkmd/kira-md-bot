module.exports = {
    name: "protection",
    alias: ["protect"],
    category: "group",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;

        const feature =
            (args[0] || "").toLowerCase();

        const action =
            (args[1] || "").toLowerCase();

        const toggle = (arr) => {

            if (action === "on") {

                if (!arr.includes(jid))
                    arr.push(jid);

                return "✅ Enabled";
            }

            if (action === "off") {

                const index =
                    arr.indexOf(jid);

                if (index > -1)
                    arr.splice(index,1);

                return "❌ Disabled";
            }

            return null;
        };

        if (feature === "antiword") {

            if (args[1] === "add") {

                const word =
                    args.slice(2).join(" ");

                if (!word)
                    return;

                global.badWords.push(word);

                return sock.sendMessage(
                    jid,
                    { text: `✅ Added: ${word}` }
                );
            }

            if (args[1] === "del") {

                const word =
                    args.slice(2).join(" ");

                global.badWords =
                    global.badWords.filter(
                        x => x !== word
                    );

                return sock.sendMessage(
                    jid,
                    { text: `✅ Removed: ${word}` }
                );
            }

            if (args[1] === "list") {

                return sock.sendMessage(
                    jid,
                    {
                        text:
global.badWords.join("\n") ||
"No words"
                    }
                );
            }

            const result =
                toggle(global.antiWordChats);

            return sock.sendMessage(
                jid,
                { text: result }
            );
        }

        if (feature === "antibot") {

            const result =
                toggle(global.antiBotChats);

            return sock.sendMessage(
                jid,
                { text: result }
            );
        }

        if (feature === "antifake") {

            const result =
                toggle(global.antiFakeChats);

            return sock.sendMessage(
                jid,
                { text: result }
            );
        }

        if (feature === "antipromote") {

            const result =
                toggle(global.antiPromoteChats);

            return sock.sendMessage(
                jid,
                { text: result }
            );
        }

        if (feature === "antidemote") {

            const result =
                toggle(global.antiDemoteChats);

            return sock.sendMessage(
                jid,
                { text: result }
            );
        }

        return sock.sendMessage(jid,{
            text:
`🛡️ PROTECTION

.protection antiword on
.protection antiword off
.protection antiword add word
.protection antiword del word
.protection antiword list

.protection antibot on
.protection antibot off

.protection antifake on
.protection antifake off

.protection antipromote on
.protection antipromote off

.protection antidemote on
.protection antidemote off`
        });
    }
};