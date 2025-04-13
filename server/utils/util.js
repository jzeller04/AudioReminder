// Convert date string to Date object with consistent handling
function normalizeDate(dateString) {
    // Parse the input date
    const inputDate = new Date(dateString);
    
    // Create a date using local components to avoid timezone issues
    const year = inputDate.getUTCFullYear();
    const month = inputDate.getUTCMonth();
    const day = inputDate.getUTCDate();
    
    // Create a new date with the same local date components
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
}
  
function dateToReadable(date) {
    const parsedDate = new Date(date);
    
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return parsedDate.toLocaleDateString('en-US', options);
}
  
function timeToTwelveSystem(time) { 
if (!time) return "";

// Split the input into hours and minutes
let [hours, minutes] = time.split(":");
hours = parseInt(hours);
minutes = parseInt(minutes);

// Determine AM or PM
const period = hours >= 12 ? 'PM' : 'AM';

// Convert hour to 12-hour format
hours = hours % 12;
hours = hours ? hours : 12; // Hour '0' should display as '12'

return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${period}`; 
}
  
export { normalizeDate, dateToReadable, timeToTwelveSystem };