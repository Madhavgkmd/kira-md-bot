// plugins/gif.js
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "gif",
    alias: ["makegif"],

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const quoted =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return await sock.sendMessage(jid, {
                text: "❌ Reply to an image or video."
            });
        }

        if (!quoted.imageMessage && !quoted.videoMessage) {
            return await sock.sendMessage(jid, {
                text: "❌ Reply to an image or video."
            });
        }

        let inputFile;
        let outputFile;

        try {
            await sock.sendMessage(jid, {
                text: "⏳ Creating GIF..."
            });

            const buffer = await downloadMediaMessage(
                { message: quoted },
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            const tempDir = path.join(__dirname, "../temp");

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const isVideo = !!quoted.videoMessage;

            inputFile = path.join(
                tempDir,
                `input_${Date.now()}.${isVideo ? "mp4" : "jpg"}`
            );

            outputFile = path.join(
                tempDir,
                `output_${Date.now()}.mp4`
            );

            fs.writeFileSync(inputFile, buffer);

            await new Promise((resolve, reject) => {
                let command = ffmpeg(inputFile);

                if (isVideo) {
                    command
                        .outputOptions([
                            "-vf",
                            "scale=320:-2,fps=15",
                            "-t",
                            "6"
                        ]);
                } else {
                    command
                        .loop(6)
                        .outputOptions([
                            "-vf",
                            "scale=320:-2"
                        ]);
                }

                command
                    .videoCodec("libx264")
                    .outputOptions([
                        "-pix_fmt",
                        "yuv420p",
                        "-movflags",
                        "+faststart"
                    ])
                    .save(outputFile)
                    .on("end", resolve)
                    .on("error", reject);
            });

            const videoBuffer = fs.readFileSync(outputFile);

            await sock.sendMessage(jid, {
                video: videoBuffer,
                gifPlayback: true,
                caption: "🎞️ GIF Created"
            });

        } catch (err) {
            console.error(err);

            await sock.sendMessage(jid, {
                text: `❌ Error: ${err.message}`
            });

        } finally {
            if (inputFile && fs.existsSync(inputFile))
                fs.unlinkSync(inputFile);

            if (outputFile && fs.existsSync(outputFile))
                fs.unlinkSync(outputFile);
        }
    }
};