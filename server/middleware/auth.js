
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    return res.redirect('/auth/login');
};

const authMiddleware = {
    isAuthenticated
};

export default authMiddleware;