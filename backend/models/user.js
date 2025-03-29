const mongoose = require('mongoose');
const Reminder = require('./reminder.js');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    // title is a string, and required for every reminder
    userEmail: {
        type: String,
        required: true
    },
    password: {
        type: String
    },
    reminders: [Reminder.schema],
}, {timestamps: true}); // saves the time when reminder is created

const User = mongoose.model('User', userSchema, 'users'); // has to be the same name as the collection in the DB
module.exports = User; // exports to other files
