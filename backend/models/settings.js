const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const settingsSchema = new Schema({
    // title is a string, and required for every reminder
    highContrast: {
        type: Boolean,
        required: true,
        default: false
    },
    volume: {
        type: Number,
        required: true,
        default: 100
    },
    pushToTalk: {
        type: Boolean,
        required: true,
        default: false
    },
    voiceCommands: {
        type: Boolean,
        required: true,
        default: true
    }

});

const Settings = mongoose.model('Settings', settingsSchema); // has to be the same name as the collection in the DB
module.exports = Settings; // exports to other files
