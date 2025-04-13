import User from '../models/user.js';
import argon2 from 'argon2';

// Sign in user
const signIn = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ userEmail: email });
        if (user && await argon2.verify(user.password, password)) {
            req.session.userId = user._id;
            return res.redirect('/');
        } else {
            return res.redirect('/login');
        }
    } catch (error) {
        console.log('Signin error:', error);
        return res.redirect('/404');
    }
};

// Create new user
const createUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (email && password) {
            const hashedPassword = await argon2.hash(password);
            const user = new User({
                userEmail: email,
                password: hashedPassword,
                preferences: {}
            });
            await user.save();
            return res.redirect('/login');
        } else {
            return res.redirect('/signup');
        }
    } catch (error) {
        console.log('Signup error:', error);
        return res.redirect('/404');
    }
};

// Logout user
const logout = (req, res) => {
    req.session.destroy(error => {
        if (error) {
            return res.redirect('/404');
        } else {
            return res.redirect('/login');
        }
    });
};

export {
    signIn,
    createUser,
    logout
};