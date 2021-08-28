// const fs = require('fs')
const path = require('path') // native
const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')

// Get modules
const AppError = require('./util/appError')
const globalErrorHandler = require('./controllers/errorController')
const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes')



// start express app
const app = express();

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))


//1) MIDDLEWARE DECLARATIONS : Middlewares we want to apply to all the routes

// Serving static files
//app.use(express.static(`${__dirname}/public`))
app.use(express.static(path.join(__dirname, 'public'))) // better to avoid bugs

// Set security HTTP Headers (Use Helmet early in the middleware stack)
app.use(helmet())

// Limit nb of request from same IP
const limiter = rateLimit({
    max: 100,               // nb of max requests (adapt it selon l'app)
    windowMs: 60 * 60 * 1000, // time window
    message: 'Too many request from this IP, please try again in one hour.'
})
app.use('/api', limiter)

// Middleware we use only in development mode
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}
// Body parser : reading data from body into req.body
app.use(express.json({ limit: '100kb' })) 

// Data sanitization against NoSQL query injection 
// SUPER IMPORTANT
app.use(mongoSanitize())

// Data sanitization against XSS 
app.use(xss())

// Prevent parameter polution
app.use(hpp({
    whiteList: [ // params we want to allow duplication
        'duration', 
        'ratingsQuantity', 
        'ratingsAverage', 
        'maxGroupSize', 
        'difficulty', 
        'price'] 
}))




// Test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString(); // add a property 'requestTime' to the req object
    next()
})

// 2) Mounting the routers

// Rendering PUG routes
app.get('/', (req, res) => {
    res.status(200).render('base')
})

app.use('/api/v1/tours', tourRouter) 
app.use('/api/v1/users', userRouter) 
app.use('/api/v1/reviews', reviewRouter) 

// Handling bad routes (app.all() applies to all http methods)
// Important to be the AT THE END of the code (runs when no other route is met)
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can't find ${req.originalUrl} on this server`
    // })
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404))
})

// Error handlers
app.use(globalErrorHandler)


// Export app
module.exports = app;



// test git 
