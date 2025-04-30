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
    console.log('Local representation:', utcDate.toLocaleDateString());
    
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
    console.log('Local representation:', normalizedDate.toLocaleDateString());
    
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
  console.log('Local representation:', normalizedDate.toLocaleDateString());
  
  return normalizedDate;
}

// Format date for human-readable display
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

// Convert 24-hour time to 12-hour format with AM/PM
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

// Format date and time for Google Calendar API
function formatDateTimeForGoogle(date, time, addMinutes = 0) {
  const dateObj = new Date(date);
  
  if (time && time.includes(':')) {
    const [hours, minutes] = time.split(':').map(Number);
    dateObj.setHours(hours, minutes, 0, 0);
  } else {
    // Default to noon if no time provided
    dateObj.setHours(12, 0, 0, 0);
  }
  
  if (addMinutes) {
    dateObj.setMinutes(dateObj.getMinutes() + addMinutes);
  }
  
  return dateObj.toISOString();
}

// Compare if two dates represent the same day (ignoring time)
function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();
}

// Parse time string from various formats to HH:MM
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  
  // Already in HH:MM format
  if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
    return timeStr;
  }
  
  // Try to extract from Date or ISO string
  try {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  } catch (e) {
    console.error('Error parsing time:', e);
  }
  
  return null;
}

export { 
  normalizeDate, 
  dateToReadable, 
  timeToTwelveSystem, 
  formatDateTimeForGoogle,
  isSameDay,
  parseTimeString
};