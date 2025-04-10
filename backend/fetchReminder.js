const { error } = require('console');
const Reminder = require('./models/reminder');
const User = require('./models/user');
console.log('fetchReminder.js loaded');
async function fetch(userId)

{
    try{
        const today = new Date(); // get todays date
        today.setUTCHours(0, 0, 0, 0); // set time to midnight
        //console.log("today:", today);
        const nextWeek = new Date(today); // create next week var
        nextWeek.setUTCHours(23, 59, 59, 999); // set to just before midnight
        nextWeek.setDate(today.getDate() + 6); // add 6 days to next week date
        const user = await User.findById(userId, {reminders: 1});
        //console.log(user);
        if(!user)
        {
            return [];
        }
        // console.log(reminders); // log the array
        
        const reminders = user.reminders.filter(reminder =>
        {
            const reminderDate = new Date(reminder.date);
            //console.log("reminder date: ", reminderDate);
            return reminder.date >= today && reminder.date < nextWeek;
        }

        );
        //console.log('filter: ',reminders)
        if(reminders)
            return reminders;
        
        return [];

    } catch {
        console.log('error');
    }
    
}

async function updateUserReminders(userId) {
    

    try
    {
        console.log('updateUserReminders CALLED for user:', userId);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate()-2);

        const result = await User.updateOne(
            {_id: userId},
            { $pull: {reminders: { date: {$lt: twoDaysAgo}}}}
        );

        console.log('Deleted old reminders', result);
        return result;
    }
    catch
    {
        console.error(error);
        return null;
    }

}

async function fetchOne(userId)
{
    try{
        const today = new Date(); // get todays date
        today.setHours(0, 0, 0, 0); // set time to midnight
        const nextWeek = new Date(today); // create next week var
        nextWeek.setHours(23, 59, 59, 999); // set to just before midnight
        nextWeek.setDate(today.getDate() + 6); // add 6 days to next week date
        const user = await User.findOne(
            {_id: userId, 'reminders.date': {$gte: today, $lt: nextWeek}},
            {'reminders': 1}
    );
        if(!user)
        {
            return [];
        }
        // console.log(reminders); // log the array
        
        const reminders = user.reminders.find(reminder =>
            reminder.date >= today && reminder.date < nextWeek
        );

        return reminders;

    } catch {
        console.log('error');
    }
    
}
module.exports = {fetch, fetchOne, updateUserReminders};