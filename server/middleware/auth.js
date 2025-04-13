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