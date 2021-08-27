const AppError = require("./../util/appError")

const handleJWTError = () => {
    return new AppError('Invalid Token. Please login again', 401)
}

const handleJWTExpiredError = () => {
    return new AppError('Your token has expired. Please login again', 401)

}

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, 400)
}

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0]
    const message = `Duplicate field value: ${value}. Please use another value`
    return new AppError(message, 400)
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message)
    const message = `Invalid input data. ${errors.join('. ')}`
    return new AppError(message, 400)
}

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })
}

const sendErrorProd = (err, res) => {
    
    // On check si l'erreur est opérationnelle (cad ne vient pas d'un bug ou erreur de code)
    // Si l'erreur est opérationnelle on veut envoyer un message au client
    // Methode : on check si l'erreur a été créé avec notre class AppError et possède donc une proprité isOperational
    if(err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        })

    // Programming or other unknown error
    // On ne veut pas envoyer les détails    
    } else {
        console.error('ERROR', err)
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong'
        })
    }
}

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if(process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res)
    } else if(process.env.NODE_ENV === 'production') {

        let error = Object.assign(err); // copie de err

        // Gerer les erreurs Mongoose, MongoDB et JWT comme des operational errors :
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error)
        if (error.name === 'JsonWebTokenError') error = handleJWTError()
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError()
        

        sendErrorProd(error,res)
    }
}

