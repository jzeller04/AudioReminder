const Reminder = require('./models/reminder');
const User = require('./models/user');
async function fetch(userId)
{
    try{
        const today = new Date(); // get todays date
        today.setHours(0, 0, 0, 0); // set time to midnight
        const nextWeek = new Date(today); // create next week var
        nextWeek.setHours(23, 59, 59, 999); // set to just before midnight
        nextWeek.setDate(today.getDate() + 6); // add 6 days to next week date
        const user = await User.findOne(
            {_id: userId, "reminders.date": {$gte: today, $lt: nextWeek}},
            {"reminders": 1}
    );
        if(!user)
        {
            return [];
        }
        // console.log(reminders); // log the array
        
        const reminders = user.reminders.filter(reminder =>
            reminder.date >= today && reminder.date < nextWeek
        );

        return reminders;

    } catch {
        console.log('error');
    }
    
}
module.exports = {fetch};