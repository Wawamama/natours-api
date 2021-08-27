const fs = require('fs')
const express = require('express');
const morgan = require('morgan')

const app = express();


//////  MIDDLEWARES ////////
app.use(morgan('dev'))
app.use(express.json()) // Middleware -> modify the request data



app.use((req, res, next) => {
    console.log('Middleware here')
    next()
})
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString(); // add a property 'requestTime' to the req object
    next()
})


// Read the data (before the route handlers bc we need it once and not in the Event loop)
const tours = JSON.parse(fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`))

//////  ROUTES HANDLERS ////////
const getAllTours = (req, res) => {
    console.log(req.requestTime)
    res.status(200).json({
        status: 'success',
        requestedAt: req.requestTime,
        results: tours.length,
        data: {
            tours: tours
        }
    })
}

const getTour = (req, res) => {
    console.log(req.params) // GET Request '127.0.0.1:3000/api/v1/tours/5 will log { id : '5' }
    const id = req.params.id *1; // converts string to number

    const tour = tours.find(el => el.id === id)

    if(!tour) {
        return res.status(404).json({
            status: 'fail',
            message: 'Invalid ID'
        })
    }
    res.status(200).json({
        status: 'success',
        data: {
            tour
        }
    })
}

const createTour = (req, res) => {
    // we create a new id (automatic with a DB but we're not using a DB)
    const newId = tours[tours.length-1].id +1
    // we create a new object newTour with all the properties from the request body + the id
    const newTour = Object.assign({id: newId}, req.body)

    tours.push(newTour)

    fs.writeFile(`${__dirname}/dev-data/data/tours-simple.json`, JSON.stringify(tours), err => {
        res.status(201) // 201 stands for 'created'
            .json({
                status:'success',
                data: {
                    tour: newTour
                }
            })
    })

}

const updateTour = (req, res) => {
    const id = req.params.id *1; // converts string to number

    if (id > tours.length) {
        return res.status(404)
            .json({
                status: 'fail',
                message: 'invalid tour'
            })
    }

    res.status(200)
        .json({
            status: 'success',
            data: {
                tour: '<Updated tour here>'
            }
        })
}

const deleteTour = (req, res) => {
    const id = req.params.id *1; // converts string to number
    if (id > tours.length) {
        return res.status(404)
            .json({
                status: 'fail',
                message: 'invalid tour'
            })
    }
    res
        .status(204) // No Content
        .json({
            status: 'deleted',
            data: null
        })

}

const getAllUsers = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined'
    })
}
const getUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined'
    })
}
const createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined'
    })
}
const updateUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined'
    })
}
const deleteUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined'
    })
}

//////  ROUTES ////////

// Declaring the routers
const tourRouter = express.Router() // Middleware
const userRouter = express.Router() // Middleware

// Mounting the routers
app.use('/api/v1/tours', tourRouter) // Call the middleware 'tourRouter' everytime we use the route /api/v1/tours
app.use('/api/v1/users', userRouter) // Call the middleware 'userRouter' everytime we use the route /api/v1/users

tourRouter.route('/')
    .get(getAllTours)
    .post(createTour)

tourRouter.route('/:id')
    .get(getTour)
    .patch(updateTour)
    .delete(deleteTour)

userRouter.route('/')
    .get(getAllUsers)
    .post(createUser)

userRouter.route('/:id')
    .get(getUser)
    .patch(updateUser)
    .delete(deleteUser)

// Listen to server ! GO !
const port = 3000;
app.listen(port, () => {
    console.log(`App running on port ${port}...`)
})


