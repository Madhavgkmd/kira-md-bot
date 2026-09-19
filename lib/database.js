// lib/database.js
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../subbot_settings.json');

function readDB() {
    try {
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
        console.error('Database read error:', err.message);
        return {};
    }
}

function writeDB(db) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch (err) {
        console.error('Database write error:', err.message);
    }
}

function getSettings(number) {
    const db = readDB();

    if (!db[number]) {
        db[number] = {
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

            // Anti Promote / Demote
            antiPromoteChats: [],
            antiDemoteChats: [],

            // Ban system
            bannedUsers: [],
            bannedGroups: [],

            settingsReplies: {}
        };

        writeDB(db);
    }

    // Add missing settings to old databases automatically
    const defaults = {
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
        withoutHandler: false,
        autoStatusView: false,
        antiPromoteChats: [],
        antiDemoteChats: [],
        bannedUsers: [],
        bannedGroups: [],
        settingsReplies: {}
    };

    let changed = false;

    for (const [key, value] of Object.entries(defaults)) {
        if (db[number][key] === undefined) {
            db[number][key] = value;
            changed = true;
        }
    }

    if (changed) writeDB(db);

    return db[number];
}

function updateSetting(number, key, value) {
    const db = readDB();

    if (!db[number]) {
        getSettings(number);
        return updateSetting(number, key, value);
    }

    db[number][key] = value;
    writeDB(db);
}

module.exports = {
    getSettings,
    updateSetting
};