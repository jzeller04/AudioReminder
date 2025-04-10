function dateToReadable(date)
{
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    return new Date(date).toLocaleDateString('en-US',options);
}

function timeToTwelveSystem(time) // thank you gippity for making my life easier here lol, strings suck
{
    // Split the input into hours and minutes
    let [hours, minutes] = time.split(":");
    hours = parseInt(hours); // Convert hours to number for comparison
    minutes = parseInt(minutes); // Convert minutes to number
    
    // Determine AM or PM
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert hour to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // Hour '0' should display as '12'

    // Format time back to a string
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${period}`; 
}

module.exports = {dateToReadable, timeToTwelveSystem};