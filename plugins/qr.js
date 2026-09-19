// plugins/qr.js
const qrcode = require('qrcode');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = [
    {
        name: "qr",
        alias: ["readqr", "scanqr"],
        category: "tools",
        description: "Generate QR from text or Read QR from replied image",
        
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const text = args.join(" ").trim();
            
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const imageMessage = quotedMsg?.imageMessage || 
                                 quotedMsg?.ephemeralMessage?.message?.imageMessage ||
                                 msg.message?.imageMessage;

            // ─── 1. IMAGE TO QR TEXT (SCANNER VIA API) ───
            if (imageMessage) {
                let filePath = null;
                try {
                    await sock.sendMessage(jid, { text: "🔍 Scanning QR code..." }, { quoted: msg });

                    // 🔥 പുതിയ Baileys സിസ്റ്റം വെച്ച് ഇമേജ് ഡൗൺലോഡ് ചെയ്യുന്നു
                    const stream = await downloadContentFromMessage(imageMessage, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    filePath = `./temp_qr_scan_${Date.now()}.jpeg`;
                    fs.writeFileSync(filePath, buffer);

                    if (!fs.existsSync(filePath)) {
                        return await sock.sendMessage(jid, { text: "❌ Failed to save the image." }, { quoted: msg });
                    }

                    // API വഴി QR റീഡ് ചെയ്യുന്നു
                    const form = new FormData();
                    form.append('file', fs.createReadStream(filePath));

                    const res = await axios.post('https://api.qrserver.com/v1/read-qr-code/', form, {
                        headers: {
                            ...form.getHeaders()
                        },
                        timeout: 15000 
                    });

                    const resultData = res.data;
                    let qrValue = null;

                    if (resultData && resultData[0] && resultData[0].symbol && resultData[0].symbol[0].data) {
                        qrValue = resultData[0].symbol[0].data;
                    }

                    try { fs.unlinkSync(filePath); } catch (err) {}

                    if (!qrValue) {
                        return await sock.sendMessage(jid, { text: "❌ Could not detect a valid QR code. Please try a clearer image." }, { quoted: msg });
                    }

                    return await sock.sendMessage(jid, { 
                        text: `✅ *QR Code Scanned Successfully!*\n\n📌 *Extracted Text:*\n${qrValue}` 
                    }, { quoted: msg });

                } catch (e) {
                    if (filePath && fs.existsSync(filePath)) {
                        try { fs.unlinkSync(filePath); } catch (err) {}
                    }
                    console.error("QR Scan Error:", e.message);
                    return await sock.sendMessage(jid, { text: `❌ An error occurred while scanning. Server might be busy.` }, { quoted: msg });
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
                    return await sock.sendMessage(jid, { text: `❌ Failed to generate QR code: ${e.message}` }, { quoted: msg });
                }
            } 
            
            // ─── 3. NO IMAGE AND NO TEXT ERROR ───
            else {
                return await sock.sendMessage(jid, { 
                    text: "❌ Provide text to generate a QR code, or reply to an image to read it!\n\n*Example:* .qr Hello World\n*Example:* .qr (as reply to image)" 
                }, { quoted: msg });
            }
        }
    }
];