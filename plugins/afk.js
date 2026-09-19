// plugins/afk.js - KIRA X MD (AFK system for owner)
const fs = require('fs');
const path = require('path');

const afkFilePath = path.join(__dirname, '../afk.json');
let afkData = {};

// Load AFK data
function loadAFK() {
    if (fs.existsSync(afkFilePath)) {
        try {
            afkData = JSON.parse(fs.readFileSync(afkFilePath, 'utf8'));
        } catch (e) { afkData = {}; }
    } else {
        afkData = {};
    }
    return afkData;
}

function saveAFK() {
    fs.writeFileSync(afkFilePath, JSON.stringify(afkData, null, 2), 'utf8');
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// Command: .afk
module.exports = {
    name: 'afk',
    alias: ['away'],
    category: 'utility',
    description: 'Set yourself as AFK (only owner)',
    usage: `${process.env.PREFIX || '.'}afk [reason]`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || jid;
        const ownerNumber = process.env.OWNER_NUMBER; // e.g., "919876543210@s.whatsapp.net"

        // Only owner can use AFK
        if (sender !== ownerNumber) {
            await sock.sendMessage(jid, { text: "❌ *Only the bot owner can use AFK mode.*" }, { quoted: msg });
            return;
        }

        const reason = (args && args.length) ? args.join(' ') : 'I am currently away from keyboard.';

        // Load current AFK data
        loadAFK();

        // Check if already AFK
        if (afkData.active) {
            // Update reason
            afkData.reason = reason;
            afkData.setAt = Date.now();
            saveAFK();
            await sock.sendMessage(jid, { text: `🌙 *AFK reason updated*\n📝 *New reason* : ${reason}` }, { quoted: msg });
        } else {
            // Set AFK
            afkData = {
                active: true,
                reason: reason,
                setAt: Date.now(),
                messageCount: 0,
                lastSeen: Date.now()
            };
            saveAFK();
            await sock.sendMessage(jid, { text: `🌙 *You're now AFK*\n📝 *Reason* : ${reason}\n\n_I'll auto‑reply when someone messages or mentions you._` }, { quoted: msg });
        }
    }
};

// Helper functions for auto‑reply (to be used in index.js)
function isAFK() {
    loadAFK();
    return afkData.active || false;
}

function getAFKInfo() {
    loadAFK();
    if (!afkData.active) return null;
    const duration = formatDuration(Date.now() - afkData.setAt);
    return {
        reason: afkData.reason,
        duration: duration,
        messageCount: afkData.messageCount || 0,
        lastSeen: afkData.lastSeen ? formatDuration(Date.now() - afkData.lastSeen) : 'Never'
    };
}

function incrementMessageCount() {
    loadAFK();
    if (afkData.active) {
        afkData.messageCount = (afkData.messageCount || 0) + 1;
        afkData.lastSeen = Date.now();
        saveAFK();
    }
}

function clearAFK() {
    loadAFK();
    if (afkData.active) {
        const duration = formatDuration(Date.now() - afkData.setAt);
        afkData = { active: false };
        saveAFK();
        return duration;
    }
    return null;
}

// Export helpers for index.js
module.exports.helpers = { isAFK, getAFKInfo, incrementMessageCount, clearAFK };