const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const preferencesSchema = new Schema({
    // title is a string, and required for every reminder
    highContrast: {
        type: String,
        required: true,
        default: 'low-contrast'
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

const Preferences = mongoose.model('Preferences', preferencesSchema); // has to be the same name as the collection in the DB
module.exports = Preferences; // exports to other files
