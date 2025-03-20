const Reminder = require('./models/reminder');
async function fetch(title)
{
    const reminderA = await Reminder.findOne({title});
    return reminderA;
}
module.exports = {fetch};