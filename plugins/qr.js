// plugins/qr.js
const qrcode = require('qrcode');
const QrCodeReader = require('qrcode-reader');
const jimp = require('jimp');
const fs = require('fs');

module.exports = [
    {
        name: "qr",
        alias: ["readqr", "scanqr"],
        category: "tools",
        description: "Generate QR from text or Read QR from replied image",
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const text = args.join(" ").trim();
            
            // കോട്ട് ചെയ്ത മെസ്സേജ് അല്ലെങ്കിൽ ഇമേജ് പരിശോധിക്കുന്നു
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const imageMessage = quotedMsg?.imageMessage || 
                                 quotedMsg?.ephemeralMessage?.message?.imageMessage ||
                                 msg.message?.imageMessage;

            // ─── 1. IMAGE TO QR TEXT (SCANNER) ───
            if (imageMessage) {
                let streamPath = null;
                try {
                    await sock.sendMessage(jid, { text: "🔍 Scanning QR code..." }, { quoted: msg });

                    // ഇമേജ് ഡൗൺലോഡ് ചെയ്ത് സേവ് ചെയ്യുന്നു
                    streamPath = await sock.downloadAndSaveMediaMessage(
                        { message: { imageMessage } }, 
                        'temp_qr_scan'
                    );

                    const filePath = streamPath.endsWith('.jpeg') ? streamPath : streamPath + '.jpeg';

                    if (!fs.existsSync(filePath)) {
                        return await sock.sendMessage(jid, { text: "❌ Failed to download the image." }, { quoted: msg });
                    }

                    // Jimp & QrCodeReader ഉപയോഗിച്ച് റീഡ് ചെയ്യുന്നു (API ഇല്ലാതെ)
                    const imageBuffer = fs.readFileSync(filePath);
                    const jimpImage = await jimp.read(imageBuffer);

                    const qrValue = await new Promise((resolve, reject) => {
                        const qr = new QrCodeReader();
                        qr.callback = (err, value) => {
                            if (err) resolve(null);
                            else resolve(value?.result);
                        };
                        qr.decode(jimpImage.bitmap);
                    });

                    // ഫയൽ ക്ലീൻ ചെയ്യുന്നു
                    try { fs.unlinkSync(filePath); } catch (err) {}
                    if (streamPath && fs.existsSync(streamPath)) {
                        try { fs.unlinkSync(streamPath); } catch (err) {}
                    }

                    if (!qrValue) {
                        return await sock.sendMessage(jid, { text: "❌ Could not detect a valid QR code in this image." }, { quoted: msg });
                    }

                    return await sock.sendMessage(jid, { 
                        text: `✅ *QR Code Scanned Successfully!*\n\n📌 *Extracted Text/Link:*\n${qrValue}` 
                    }, { quoted: msg });

                } catch (e) {
                    if (streamPath && fs.existsSync(streamPath)) {
                        try { fs.unlinkSync(streamPath); } catch (err) {}
                    }
                    return await sock.sendMessage(jid, { text: "❌ An error occurred while processing the image." }, { quoted: msg });
                }
            } 
            
            // ─── 2. TEXT TO QR CODE IMAGE ───
            else if (text) {
                try {
                    const qrBuffer = await qrcode.toBuffer(text);
                    
                    return await sock.sendMessage(jid, { 
                        image: qrBuffer, 
                        caption: `✅ *QR Code Generated Successfully!*\n\n📌 *Data:* ${text}` 
                    }, { quoted: msg });
                    
                } catch (e) {
                    return await sock.sendMessage(jid, { text: "❌ Failed to generate QR code." }, { quoted: msg });
                }
            } 
            
            // ─── 3. NO IMAGE AND NO TEXT ERROR ───
            else {
                return await sock.sendMessage(jid, { 
                    text: "❌ Provide text to generate a QR code, or reply to an image to read it!\n\nExample: .qr Hello World\nExample: .qr (as reply to image)" 
                }, { quoted: msg });
            }
        }
    }
];