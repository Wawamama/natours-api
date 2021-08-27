class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor)
    }
}

module.exports = AppError;

// status 400, 404, 401 : fail | status 500 : error
// On definit une propritété isOperational pour savoir qu'il s'agit d'une erreur operationnelle (voulue)