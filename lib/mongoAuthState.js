const mongoose = require("mongoose");

// Define a schema for storing sub-bot session data in MongoDB
const SubBotSessionSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    creds: { type: Object, required: true },
    keys: { type: Map, of: Object, default: {} }
});

const SubBotSession = mongoose.models.SubBotSession || mongoose.model("SubBotSession", SubBotSessionSchema);

async function useMongoAuthState(phoneNumber) {
    const cleanNumber = String(phoneNumber).replace(/[^0-9]/g, "");

    // Fetch existing session from DB or initialize empty
    let sessionDoc = await SubBotSession.findOne({ phoneNumber: cleanNumber });
    
    let creds = sessionDoc?.creds || require("@whiskeysockets/baileys").initAuthCreds();
    let keys = sessionDoc?.keys ? new Map(Object.entries(sessionDoc.keys)) : new Map();

    const saveCreds = async () => {
        const keysObj = {};
        for (const [key, value] of keys.entries()) {
            keysObj[key] = value;
        }

        await SubBotSession.findOneAndUpdate(
            { phoneNumber: cleanNumber },
            { 
                creds: JSON.parse(JSON.stringify(creds)),
                keys: keysObj 
            },
            { upsert: true, new: true }
        );
    };

    const removeCreds = async () => {
        await SubBotSession.deleteOne({ phoneNumber: cleanNumber });
    };

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    const dict = keys.get(type) || {};
                    ids.forEach(id => {
                        let value = dict[id];
                        if (value) {
                            data[id] = value;
                        }
                    });
                    return data;
                },
                set: async (data) => {
                    for (const type in data) {
                        let dict = keys.get(type) || {};
                        for (const id in data[type]) {
                            dict[id] = data[type][id];
                        }
                        keys.set(type, dict);
                    }
                    await saveCreds();
                }
            }
        },
        saveCreds,
        removeCreds
    };
}

async function getSubBotNumbers() {
    try {
        const docs = await SubBotSession.find({}, { phoneNumber: 1 });
        return docs.map(d => d.phoneNumber);
    } catch (e) {
        return [];
    }
}

module.exports = { useMongoAuthState, getSubBotNumbers };