function dateToReadable(date){
    const localDate = formatDate(date);
    const utcDate = "2025-04-10T00:00:00.000+00:00";
    console.log("Input Date (UTC):", utcDate);
    console.log("Converted Local Date:", localDate);
    return localDate;
}

function timeToTwelveSystem(time){ // thank you gippity for making my life easier here lol, strings suck
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

function formatDate(date) {
    const parsedDate = new Date(date);
    parsedDate.setHours(parsedDate.getHours() + new Date().getTimezoneOffset() / 60); // Adjust for the time zone offset

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    const localDate = parsedDate.toLocaleDateString('en-US', options);
    console.log("Adjusted Local Date: ", localDate); // For debugging
    return localDate;
}

export {dateToReadable, timeToTwelveSystem};