const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit"); // pdfkit പാക്കേജ് ഉപയോഗിക്കുന്നു

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// ഓരോ യൂസറിനും സേവ് ചെയ്യുന്ന ഫോട്ടോകൾ ഓർത്തു വെക്കാനുള്ള ഡാറ്റാബേസ്
if (!global.pdfSessions) {
    global.pdfSessions = {};
}

module.exports = {
    name: "pdf",
    alias: ["topdf", "makepdf"],
    category: "media",
    description: "Convert multiple images to a single PDF",
    usage: ".pdf (reply to img) | .pdf get | .pdf clear",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const input = (args[0] || '').toLowerCase();

        // യൂസറിന്റെ സെഷൻ ക്രിയേറ്റ് ചെയ്യുന്നു
        if (!global.pdfSessions[sender]) {
            global.pdfSessions[sender] = [];
        }

        // 🟢 1. പിഡിഎഫ് ആക്കി മാറ്റാൻ (.pdf get)
        if (input === 'get' || input === 'done') {
            const images = global.pdfSessions[sender];
            if (images.length === 0) {
                return await sock.sendMessage(jid, { text: "❌ *No images added!* ആദ്യം ഫോട്ടോകൾക്ക് `.pdf` എന്ന് റിപ്ലൈ കൊടുക്കുക." }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
            const statusMsg = await sock.sendMessage(jid, { text: `📑 *Generating PDF with ${images.length} pages...*` });

            const pdfPath = path.join(tempDir, `KIRA_Output_${sender.split('@')[0]}_${Date.now()}.pdf`);

            try {
                const doc = new PDFDocument({ autoFirstPage: false });
                const stream = fs.createWriteStream(pdfPath);
                doc.pipe(stream);

                // ഫോട്ടോകൾ എല്ലാം പിഡിഎഫ് പേജുകളാക്കി മാറ്റുന്നു
                for (const imgPath of images) {
                    if (fs.existsSync(imgPath)) {
                        const img = doc.openImage(imgPath);
                        // ഫോട്ടോയുടെ അതേ സൈസിൽ പേജ് സെറ്റ് ചെയ്യുന്നു
                        doc.addPage({ size: [img.width, img.height] });
                        doc.image(img, 0, 0);
                    }
                }
                doc.end();

                // പിഡിഎഫ് റൈറ്റ് ചെയ്ത് തീരുന്നതുവരെ വെയിറ്റ് ചെയ്യുക
                await new Promise((resolve) => stream.on('finish', resolve));

                const pdfBuffer = fs.readFileSync(pdfPath);
                await sock.sendMessage(jid, { 
                    document: pdfBuffer, 
                    mimetype: 'application/pdf', 
                    fileName: `KIRA_X_MD_${images.length}_Pages.pdf`,
                    caption: `✅ *Here is your PDF!* (${images.length} pages)`
                }, { quoted: msg });

                await sock.sendMessage(jid, { text: "✅ *PDF Generated Successfully!*", edit: statusMsg.key });
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error(err);
                await sock.sendMessage(jid, { text: "❌ *Failed to generate PDF!*", edit: statusMsg.key });
            } finally {
                // എല്ലാം കഴിഞ്ഞാൽ ടെമ്പ് ഫയലുകൾ ഡിലീറ്റ് ചെയ്യുക
                for (const imgPath of images) {
                    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                }
                if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                global.pdfSessions[sender] = []; // സെഷൻ റീസെറ്റ് ചെയ്തു
            }
            return;
        }

        // 🔴 2. ആഡ് ചെയ്തത് ക്ലിയർ ചെയ്യാൻ (.pdf clear)
        if (input === 'clear') {
            const images = global.pdfSessions[sender];
            for (const imgPath of images) {
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }
            global.pdfSessions[sender] = [];
            return await sock.sendMessage(jid, { text: "🗑️ *PDF Session cleared!* (എല്ലാം റീസെറ്റ് ചെയ്തു)" }, { quoted: msg });
        }

        // 🔵 3. പുതിയ ഫോട്ടോ ആഡ് ചെയ്യാൻ (.pdf)
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.imageMessage) {
            return await sock.sendMessage(jid, { 
                text: "📌 *How to use:*\n1️⃣ ഫോട്ടോക്ക് റിപ്ലൈ ആയി `.pdf` അടിക്കുക.\n2️⃣ എത്ര ഫോട്ടോ വേണമെങ്കിലും ഇങ്ങനെ ആഡ് ചെയ്യാം.\n3️⃣ എല്ലാം കഴിഞ്ഞാൽ `.pdf get` അടിക്കുക." 
            }, { quoted: msg });
        }

        // മാക്സിമം 100 ഫോട്ടോകൾ ലിമിറ്റ് (സെർവർ ക്രാഷ് ആവാതിരിക്കാൻ)
        if (global.pdfSessions[sender].length >= 100) {
            return await sock.sendMessage(jid, { text: "⚠️ *Limit Reached!* 100 ഫോട്ടോകൾ ആയി. ഇനി `.pdf get` അടിച്ച് PDF ആക്കുക." }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⬇️", key: msg.key } });
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            
            const imgPath = path.join(tempDir, `pdf_img_${sender.split('@')[0]}_${Date.now()}.jpg`);
            fs.writeFileSync(imgPath, buffer);
            
            global.pdfSessions[sender].push(imgPath);
            const count = global.pdfSessions[sender].length;
            
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            await sock.sendMessage(jid, { text: `✅ *Image Added!* [Page ${count}]\n\n_അടുത്ത ഫോട്ടോയ്ക്ക് \`.pdf\` എന്ന് കൊടുക്കാം, അല്ലെങ്കിൽ \`.pdf get\` അടിച്ച് PDF ആക്കാം._` }, { quoted: msg });
        } catch (err) {
            console.error("PDF Image add error:", err);
            await sock.sendMessage(jid, { text: "❌ *Failed to add image!*" }, { quoted: msg });
        }
    }
};