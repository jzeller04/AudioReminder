const Reminder = require('./models/reminder');
async function fetch()
{
    try{
        const today = new Date(); // get todays date
        today.setHours(0, 0, 0, 0); // set time to midnight
        const nextWeek = new Date(today); // create next week var
        nextWeek.setHours(23, 59, 59, 999); // set to just before midnight
        nextWeek.setDate(today.getDate() + 6); // add 6 days to next week date
        const reminders = await Reminder.find({
            date: {
                $gte: today, // greater than equal to today, but less than next week (7 days)
                $lt: nextWeek
            }
        });
        // console.log(reminders); // log the array
        return reminders; // return array of reminders to be sent to front end
    } catch{
        console.log('error');
    }
    
}
module.exports = {fetch};