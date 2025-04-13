const argon2 = require('argon2');

async function encrypt(password) {
    try
    {
        const hash = await argon2.hash(password);
        return hash;
    }
    catch (err)
    {
        console.log(err);
    }
}

async function verifyPassword(password, hash) {
    try {
        if(await argon2.verify(hash, password))
        {
            return true;
        }
        else
        {
            return false;
        }
    } catch (error) {
        console.log(error);
    }   
}

module.exports = {encrypt, verifyPassword};