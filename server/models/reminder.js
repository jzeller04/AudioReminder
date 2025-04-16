import mongoose from 'mongoose';
const { Schema } = mongoose;

const reminderSchema = new Schema({
    // title is a string, and required for every reminder
    title: {
        type: String,
        required: true
    },
    flagged: {
        type: Boolean,
        default: false
    },
    description: {
        type: String
    },
    time:{
        type: String, // will have to check if input is actually time/change this later
        required: true
    },
    date: {
        type: Date,
        required: true
    }
}, {timestamps: true}); // saves the time when reminder is created

const Reminder = mongoose.model('Reminder', reminderSchema); // has to be the same name as the collection in the DB
export default Reminder; // exports to other files
