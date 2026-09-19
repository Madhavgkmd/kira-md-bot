const fs = require("fs");
const path = require("path");

const commands = [];

function loadPlugins() {

    console.log("📦 Loading Plugins...");

    commands.length = 0;

    const pluginPath = path.join(__dirname, "../plugins");

    if (!fs.existsSync(pluginPath)) {
        fs.mkdirSync(pluginPath);
    }

    const files = fs.readdirSync(pluginPath);

    for (const file of files) {

        if (!file.endsWith(".js")) continue;

        try {

            delete require.cache[
                require.resolve(
                    path.join(pluginPath, file)
                )
            ];

            const cmd = require(
    path.join(pluginPath, file)
);

if (Array.isArray(cmd)) {
    commands.push(...cmd);
} else {
    commands.push(cmd);
}

        } catch (err) {

            console.log(
                `❌ Plugin Error: ${file}`
            );
        }
    }

    console.log("🚀 KIRA X MD STARTED");
console.log(`✅ ${commands.length} Plugins Loaded`);
}

module.exports = {
    commands,
    loadPlugins
};