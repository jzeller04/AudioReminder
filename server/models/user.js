import mongoose from 'mongoose';
import Reminder from './reminder.js';
import Preferences from './settings.js';

const Schema = mongoose.Schema;

const userSchema = new Schema({
    // title is a string, and required for every reminder
    userEmail: { type: String, required: true},
    password: { type: String},
    reminders: [ Reminder.schema],
    preferences: { type: Preferences.schema}
}, {timestamps: true}); // saves the time when reminder is created

const User = mongoose.model('User', userSchema, 'users'); // has to be the same name as the collection in the DB
export default User; // exports to other files