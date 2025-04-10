const User = require('./models/user.js');
const Reminder = require('./models/reminder.js');

async function saveReminderToUser(title, description, time, date, userId) { // use express-session to save user session in website
    if (title) {
        const reminder = new Reminder(
            {
                title: title,
                description: description,
                date: date,
                time: time
            }
        );

        const updateUser = await User.findOneAndUpdate(
            {_id: userId},
            {$push: {reminders: reminder}}, // push new reminder to reminder array in user
            {new: true}
        );
        if(updateUser)
        {
            console.log(reminder);
        }
        
    }
}
module.exports = {saveReminderToUser};