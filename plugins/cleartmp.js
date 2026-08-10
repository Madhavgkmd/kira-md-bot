// plugins/cleartmp.js - Clear temporary files to fix ENOSPC error
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'cleartmp',
    alias: ['cleartemp', 'delcache', 'freestorage'],
    category: 'owner',
    description: 'Clear stuck temporary media files to free up space',

    async execute(sock, msg, args, isOwner) {
        const jid = msg.key.remoteJid;
        
        if (!isOwner) {
            return await sock.sendMessage(jid, { text: "❌ *Owner only command!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🧹", key: msg.key } });

        const directory = process.cwd(); // നിന്റെ മെയിൻ ബോട്ട് ഫോൾഡർ
        let deletedCount = 0;
        let totalSizeFreed = 0;

        try {
            const files = fs.readdirSync(directory);

            for (const file of files) {
                // mp3, mp4, ogg അല്ലെങ്കിൽ 'temp_' വെച്ച് തുടങ്ങുന്ന ഫയലുകൾ മാത്രം ഡിലീറ്റ് ചെയ്യുക
                if (file.endsWith('.mp3') || file.endsWith('.mp4') || file.endsWith('.ogg') || file.startsWith('temp_')) {
                    const filePath = path.join(directory, file);
                    try {
                        const stats = fs.statSync(filePath);
                        totalSizeFreed += stats.size;
                        fs.unlinkSync(filePath); // ഫയൽ ഡിലീറ്റ് ചെയ്യുന്നു
                        deletedCount++;
                    } catch (e) {
                        console.log(`Could not delete ${file}:`, e.message);
                    }
                }
            }

            // സൈസ് MB-ലേക്ക് മാറ്റാൻ
            const freedMB = (totalSizeFreed / (1024 * 1024)).toFixed(2);

            await sock.sendMessage(jid, {
                text: `✅ *Storage Cleared Successfully!*\n\n🗑️ *Deleted Files:* ${deletedCount}\n💾 *Space Freed:* ${freedMB} MB\n\n> _ENOSPC Issue Resolved_`
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Clear Temp Error:", err);
            await sock.sendMessage(jid, { text: "❌ *Failed to clear temporary files.*" }, { quoted: msg });
        }
    }
};