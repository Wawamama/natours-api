const dotenv = require('dotenv')
const mongoose = require('mongoose')

// Handle uncaught exceptions (needed before we require the main app)
process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION')
    console.log(err.name, err.message)
    process.exit(1)
})

dotenv.config({ path: './config.env' });
const app = require('./app')

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then( () => {
    console.log('DB connection successful')
})


// Start Server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`)
})


// Handle unhandled promise rejection
process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION')
    console.log(err.name, err.message)
    // Clean close :
    server.close(() => {
        process.exit(1)
    })
})