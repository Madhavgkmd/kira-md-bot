const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

module.exports = {
    name: "hug",
    category: "anime",
    description: "Sends a warm anime hug gif",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        try {
            // ലോഡിങ് റിയാക്ഷൻ 🫂
            await sock.sendMessage(jid, { react: { text: "🫂", key: msg.key } });

            // API യിൽ നിന്ന് GIF ലിങ്ക് എടുക്കുന്നു
            const apiUrl = "https://nekos.life/api/v2/img/hug";
            const { data } = await axios.get(apiUrl, { timeout: 15000 });
            const hugUrl = data?.url;

            if (!hugUrl) throw new Error("Invalid URL received from API");

            // ടെമ്പററി ഫയൽ പാത്തുകൾ സെറ്റ് ചെയ്യുന്നു
            const tempGif = path.join(process.cwd(), `hug_${Date.now()}.gif`);
            const tempMp4 = path.join(process.cwd(), `hug_${Date.now()}.mp4`);

            // GIF ഡൗൺലോഡ് ചെയ്യുന്നു
            const response = await axios.get(hugUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(tempGif, response.data);

            // FFmpeg ഉപയോഗിച്ച് GIF-നെ വാട്സാപ്പിന് സപ്പോർട്ട് ആവുന്ന MP4 ആക്കി മാറ്റുന്നു
            const ffmpegCmd = `ffmpeg -i ${tempGif} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${tempMp4} -y`;

            exec(ffmpegCmd, async (err) => {
                if (err) {
                    console.error("FFmpeg Conversion Error:", err.message);
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                } else {
                    // കൺവെർട്ട് ചെയ്ത MP4 വീഡിയോ വാട്സാപ്പിലേക്ക് അയക്കുന്നു
                    const mp4Buffer = fs.readFileSync(tempMp4);
                    
                    await sock.sendMessage(
                        jid,
                        {
                            video: mp4Buffer,
                            gifPlayback: true, // വാട്സാപ്പിൽ ഇത് ലൂപ്പ് ആവുന്ന GIF ആയി കാണിക്കാൻ
                            caption: "⊱ ────── {.⋅ ✯ ⋅.} ────── ⊰\n♡ Sending a warm anime hug ♡\n⊱ ─────────────────── ⊰"
                        },
                        { quoted: msg }
                    );

                    // സക്സസ് റിയാക്ഷൻ ✅
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }

                // അയച്ചുകഴിഞ്ഞാൽ മെമ്മറി ഫ്രീ ആക്കാൻ ആ ഫയലുകൾ ഡിലീറ്റ് ചെയ്യുന്നു (Clean up)
                if (fs.existsSync(tempGif)) fs.unlinkSync(tempGif);
                if (fs.existsSync(tempMp4)) fs.unlinkSync(tempMp4);
            });

        } catch (err) {
            console.error("HUG PLUGIN ERROR:", err.message);

            // എറർ റിയാക്ഷൻ ❌
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                jid,
                { text: "❌ *Oops! Failed to fetch hug gif. Please try again.*" },
                { quoted: msg }
            );
        }
    }
};