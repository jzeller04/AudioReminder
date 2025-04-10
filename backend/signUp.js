const {encrypt, verifyPassword} = require('./passwordHash.js');
const argon2 = require('argon2');
const User = require('./models/user.js');

async function createUserWithSignUp(email, password) {

    if(email && password)
    {
        const hashedPassword = await argon2.hash(password);
        const user = new User(
            {
                userEmail: email,
                password: hashedPassword,
                settings: {}
            }
        );
        user.save();
        return 0; // 0 means success
    }
    else
    {
        return -1; // -1 means an empty field
    }
}

module.exports = {createUserWithSignUp};


