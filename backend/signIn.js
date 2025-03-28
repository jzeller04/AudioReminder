const {encrypt, verifyPassword} = require('./passwordHash.js');
const argon2 = require('argon2');
const User = require('./models/user.js');

async function signInSuccess(email, password)
{
    try {
        const foundUserID = await User.findOne({userEmail: email})
        
        if(foundUserID)
        {
            const success = await argon2.verify(foundUserID.password, password);
            console.log(success);
            return success;
        }
        else
        {
            console.log('false');
            return false;
        }

    } catch (error) {
        console.log(error);
    }
}
module.exports = {signInSuccess};