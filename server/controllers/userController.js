import User from '../models/user.js';

// Update user settings
const updateSettings = async (req, res) => {
    try {
        const settings = req.body.setting;
        const userId = req.session.userId;
        
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            console.log('User not found');
            return res.redirect('/user/settings');
        }
        
        console.log("Before Update:", user.preferences);
        
        // Update settings based on the request
        switch (settings) {
            case 'highContrastHandle':
                if (user.preferences.highContrast == 'low-contrast') {
                    user.preferences.highContrast = 'high-contrast';
                } else if (user.preferences.highContrast == 'high-contrast') {
                    user.preferences.highContrast = 'low-contrast';
                }
                break;
            case 'voiceCommandHandle':
                user.preferences.voiceCommands = !user.preferences.voiceCommands;
                break;
            case 'pushToTalkHandle':
                user.preferences.pushToTalk = !user.preferences.pushToTalk;
                break;
            default:
                break;
        }
        
        console.log("After Update:", user.preferences);
        
        // Save updated user
        await user.save();
        
        return res.redirect('/user/settings');
    } catch (error) {
        console.log(error);
        return res.redirect('/user/settings');
    }
};

// Get user preferences for API
const getUserPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        return res.json({ preferences: user.preferences });
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

export {
    updateSettings,
    getUserPreferences
};