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
        )
        if(updateUser)
        {
            console.log(reminder);
        }
        
    }
}

async function saveUserSettings(settings, userId) {
    try {
        // Fetch the user by ID
        const user = await User.findOne({ _id: userId });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log("Before Update:", user.settings); // for dev purposes atm

        // Toggle settings based on the `settings` value
        switch (settings) {
            case 'highContrastHandle':
                user.settings.highContrast = !user.settings.highContrast;
                break;
            case 'voiceCommandHandle':
                user.settings.voiceCommands = !user.settings.voiceCommands;
                break;
            case 'pushToTalkHandle':
                user.settings.pushToTalk = !user.settings.pushToTalk;
                break;
            default:
                break;
        }

        console.log("After Update:", user.settings); // for dev purposes atm

        // Save the updated user settings
        await user.save();

    } catch (error) {
        console.log(error);
    }
}
module.exports = {saveReminderToUser, saveUserSettings};