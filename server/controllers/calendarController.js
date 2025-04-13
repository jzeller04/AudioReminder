import User from '../models/user.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getCalendarPage = async (req, res) => {
    try {
      // Get the user's reminders
      const user = await User.findById(req.session.userId, {reminders: 1});
      let reminders = [];
      
      if (user && user.reminders) {
        reminders = user.reminders.map(reminder => {
          // Convert to plain object if it's a Mongoose document
          const plainReminder = reminder.toObject ? reminder.toObject() : {...reminder};
          
          // Ensure date is properly formatted
          if (plainReminder.date) {
            // Store original date for debugging
            plainReminder._originalDate = plainReminder.date.toISOString();
            
            // Create new date object to ensure proper handling
            const dateObj = new Date(plainReminder.date);
            
            // Keep the date in ISO format for client-side parsing
            plainReminder.date = dateObj.toISOString();
            
            // Add debug info
            plainReminder._debug = {
              year: dateObj.getFullYear(),
              month: dateObj.getMonth(),
              day: dateObj.getDate(),
              localString: dateObj.toLocaleDateString()
            };
          }
          
          return plainReminder;
        });
      }
      
      // Read the calendar HTML template
      const template = await fs.readFile(path.join(__dirname, '../../views/calendar.html'), 'utf8');
      
      // Insert the reminders data as a JavaScript variable
      const reminderScript = `<script>
        window.calendarReminders = ${JSON.stringify(reminders)};
        console.log("Calendar reminders loaded:", window.calendarReminders);
      </script>`;
      
      // Insert the script before the closing body tag
      const finalHTML = template.replace('</body>', `${reminderScript}</body>`);
      
      return res.send(finalHTML);
    } catch (error) {
      console.error('Error loading calendar:', error);
      return res.sendFile('calendar.html', { root: path.join(__dirname, '../../views') });
    }
  };

export { getCalendarPage };