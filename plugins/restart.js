module.exports = {
    name: 'restart',
    alias: ['reboot'],
    category: 'owner',
    description: 'Restart the bot',
    async execute(sock, msg, args) {
        // ബോട്ട് ഉടമസ്ഥൻ ആണോ എന്ന് ഉറപ്പുവരുത്താൻ ഇവിടെ ഒരു ചെക്ക് വെക്കുന്നത് നല്ലതാണ്
        await sock.sendMessage(msg.key.remoteJid, { text: "🔄 *Restarting bot...*" }, { quoted: msg });
        process.exit(); // ഇത് ബോട്ട് ക്ലോസ് ചെയ്യും, റെയിൽവേ ഉടനെ തന്നെ ബോട്ടിനെ വീണ്ടും സ്റ്റാർട്ട് ചെയ്യും
    }
};