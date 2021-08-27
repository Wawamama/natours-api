const fs = require('fs')
const express = require('express');
const { json } = require('express');
const app = express();

app.use(express.json()) // Middleware -> modify the request data

// Read the data (before the route handlers bc we need it once and not in the Event loop)
const tours = JSON.parse(fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`))

// Route handlers

// Get All Tours
app.get('/api/v1/tours', (req, res) => {
    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            tours: tours
        }
    })
})

// Get One Specific tour
app.get('/api/v1/tours/:id', (req, res) => {
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
})

// Create New Tour
app.post('/api/v1/tours', (req, res) => {
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

})

// Update A Tour
app.patch('/api/v1/tours/:id', (req, res) => {
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
})

// Delete Tour
app.delete('/api/v1/tours/:id', (req, res) => {
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

})

// Listen to server ! GO !
const port = 3000;
app.listen(port, () => {
    console.log(`App running on port ${port}...`)
})


