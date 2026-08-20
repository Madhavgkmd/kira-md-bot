module.exports = {
    name: "uptime",
    alias: ["runtime", "status"],
    category: "info",
    description: "Check bot running time",
    usage: ".uptime",
    
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const getUptime = (ms) => {
            const days = Math.floor(ms / (24 * 60 * 60 * 1000));
            const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((ms % (60 * 1000)) / 1000);
            
            let str = "";
            if (days > 0) str += `${days}d `;
            if (hours > 0 || days > 0) str += `${hours}hr `;
            if (minutes > 0 || hours > 0 || days > 0) str += `${minutes}min `;
            str += `${seconds}sec`;
            
            return str.trim();
        };

        // ബോട്ട് സ്റ്റാർട്ട് ആയ സമയം ഗ്ലോബൽ വേരിയബിളിൽ ഉണ്ടെന്ന് ഉറപ്പുവരുത്തുന്നു
        const startTime = global.startTime || Date.now();
        const ms = Date.now() - startTime;
        const uptime = getUptime(ms);

        // വളരെ സിമ്പിൾ ആയ ക്ലീൻ മെസ്സേജ്
        await sock.sendMessage(jid, { 
            text: `🤖 *Bot Uptime :* ${uptime}` 
        }, { quoted: msg });
    }
};