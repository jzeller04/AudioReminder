// Convert date string to Date object with consistent handling
function normalizeDate(dateString) {
  console.log('normalizeDate input:', dateString, typeof dateString);
  
  // For YYYY-MM-DD format strings from date inputs (local reminders)
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Parse the year, month, day components directly
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create a UTC date to prevent timezone shifts
    const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    
    console.log('Local reminder date parsed as UTC:', utcDate);
    console.log('UTC ISO string:', utcDate.toISOString());
    console.log('Local representation:', utcDate.toLocaleString());
    
    return utcDate;
  }
  
  // For Google Calendar events with timezone info (like "2025-04-26T02:30:00.000Z")
  if (typeof dateString === 'string' && dateString.includes('T') && dateString.includes('Z')) {
    // Parse the string directly to get the local date components
    const localDate = new Date(dateString);
    
    // Get LOCAL components (preserves the day as seen in local calendar)
    const year = localDate.getFullYear();
    const month = localDate.getMonth();
    const day = localDate.getDate();
    
    // Create a new UTC date at noon to preserve the local day
    const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
    
    console.log('Google Calendar date normalized:', normalizedDate);
    console.log('Original date local representation:', localDate.toLocaleString());
    console.log('Normalized date:', normalizedDate.toISOString());
    
    return normalizedDate;
  }
  
  // For Date objects (already parsed dates)
  if (dateString instanceof Date) {
    // Get LOCAL components (preserves the day as seen in local calendar)
    const year = dateString.getFullYear();
    const month = dateString.getMonth();
    const day = dateString.getDate();
    
    // Create a new UTC date at noon
    const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
    
    console.log('Date object normalized:', normalizedDate);
    console.log('UTC ISO string:', normalizedDate.toISOString());
    console.log('Local representation:', normalizedDate.toLocaleString());
    
    return normalizedDate;
  }
  
  // For any other format
  const inputDate = new Date(dateString);
  
  if (isNaN(inputDate.getTime())) {
    console.error('Invalid date input:', dateString);
    return new Date(); // Return current date as fallback
  }
  
  // Get LOCAL date components (year, month, day)
  const year = inputDate.getFullYear();
  const month = inputDate.getMonth();
  const day = inputDate.getDate();
  
  // Create a new UTC date at noon
  const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
  
  console.log('Generic date normalized:', normalizedDate);
  console.log('UTC ISO string:', normalizedDate.toISOString());
  console.log('Local representation:', normalizedDate.toLocaleString());
  
  return normalizedDate;
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