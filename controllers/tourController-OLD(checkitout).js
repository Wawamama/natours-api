const Tour = require('./../models/tourModel')

// import data from a json file :
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`))

// import from database \o/


// exports.checkID = (req, res, next, val) => {
//     console.log('Tour id issss... ' + val)

//     const id = req.params.id *1; // converts string to number
//     if (id > tours.length) {
//         return res.status(404)
//             .json({
//                 status: 'fail',
//                 message: 'invalid tour'
//             })
//     }

//     next()
// }

// exports.checkBody = (req, res, next) => {
//     console.log('checking name and price')
//     if (!req.body.name || !req.body.price) {
//         return res.status(400)
//             .json({
//                 status: 'fail',
//                 message: 'Your Tour needs a name and a price'
//             })
//     }
//     next()
// }

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5'
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
    next()
}



exports.getAllTours = async (req, res) => {
    // console.log(req.requestTime)
    try {

        console.log(req.query)

        // BUILD THE QUERY

        // 1A. FILTERING
        const queryObj = {...req.query}
        const excludedFields = ['page', 'sort', 'limit', 'fields'] // fields we'll use for sorting, pagination and field limiting
        excludedFields.forEach(field => delete queryObj[field])

        // 1B. ADVANCED FILTERING (greater or smaller than...)
            // In the request we use [gte] and it returns : { duration: { gte: '5' }, difficulty: 'easy' }
            // We want the same thing but with the '$' operator for mongodb -> { duration: { $gte: '5' }, difficulty: 'easy' }
            // So we want to replace gte, gt, lte and lt 

        let queryString = JSON.stringify(queryObj);
        queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)
        
        // Queries for filtering using Mongoose special methods) :
        // const query = Tour.find()
        //     .where('duration').lte(5)
        //     .where('difficulty').equals('easy')
        
        let finalQuery = Tour.find((JSON.parse(queryString))) // no argument will return all the documents

        // 2. SORTING
        if(req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ')
            // in case of tie we can add a second criteria : sort('price ratingsAverage)
            finalQuery = finalQuery.sort(sortBy)   
        } else {
            finalQuery = finalQuery.sort('-createdAt')
        }

        // 3. FIELD LIMITING (we don't want to send back all the data everytime => bande passante)
        if(req.query.fields) {
            const fields = req.query.fields.split(',').join(' ')
            // what we want : finalQuery.select('name duration price')
            finalQuery = finalQuery.select(fields)
        } else {
            finalQuery = finalQuery.select('-__v') // exclude the field '__v' automatically added by mongo
        }

        // 4. PAGINATION (we don't want to show ALL the results)
            // exemple de query pour afficher la page 2 et 10 resultats par page : 
            // page=2&limit=10 ==> 1-10 on page 1, 11-20 on page 2, 21-30 on page 3 ...
            // we need to skip 10 results to see page 2 :
            // finalQuery = finalQuery.skip(10).limit(10)

        const page = req.query.page * 1 || 1 // converts string to number, default page = 1
        const limit = req.query.limit * 1 || 100 // default limit = 100 
        const skip = (page -1) * limit
        finalQuery = finalQuery.skip(skip).limit(limit)

        if (req.query.page) {
            const numOfTours = await Tour.countDocuments()
            if (skip >= numOfTours) throw new Error('This page does not exist')
        }
        
        // EXECUTE THE QUERY
        const tours = await finalQuery

        // SEND RESPONSE
        res.status(200).json({
            status: 'success',
            results: tours.length,
            data: {
                tours: tours
            }
        })
    } catch(err) {
        res.status(404).json({
            status: 'fail',
            message: err
        })
    }
 
}

exports.getTour = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id)
        // Works the same as : Tour.findOne({ _id: req.params.id })

        res.status(200).json({
            status: 'success',
            data: {
                tour
            }
        })
    } catch(err) {
        res.status(404).json({
            status: 'fail',
            message: err
        })
    }

  
}

exports.createTour = async (req, res) => {
    // Method 1 
    // const newTour = new Tour({})
    // newTour.save()

    // Method 2 (better)
    try {
        const newTour = await Tour.create(req.body)
    
        res.status(201) // 201 stands for 'created'
            .json({
                status:'success',
                data: {
                    tour: newTour
                }
            })
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        })
    }
    
}

exports.updateTour = async (req, res) => {
    try {
        const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        res.status(200)
        .json({
            status: 'success',
            data: {
                tour: tour
            }
        })
    } catch(err) {
        res.status(400).json({
            status: 'fail',
            message: 'Invalid data sent'
        })
    }
  
}

exports.deleteTour = async (req, res) => {
    try {

        await Tour.findByIdAndDelete(req.params.id)

        res
        .status(204) // No Content
        .json({
            status: 'deleted',
            data: null
        })
    } catch(err) {
        res.status(400).json({
            status: 'fail',
            message: err
        })
    }
}