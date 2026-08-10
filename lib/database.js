// lib/database.js
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../subbot_settings.json');

function getSettings(number) {
    const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};
    return db[number] || {
        botMode: 'public',
        autoDlAllGroups: false,
        autoDlAllDms: false,
        antiDeleteChats: [],
        welcomeChats: [],
        goodbyeChats: [],
        antilinkChats: [],
        callReject: false,
        botOnline: true,
        autoRead: false,
        autoReact: false,
        autoReply: false,
        autoVV: false,
        autoSticker: false,
        withoutHandler: false,
        autoStatusView: false,
        settingsReplies: {}
    };
}

function updateSetting(number, key, value) {
    const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};
    if (!db[number]) db[number] = getSettings(number);
    db[number][key] = value;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

module.exports = { getSettings, updateSetting };