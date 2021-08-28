const AppError = require('../util/appError')
const Tour = require('./../models/tourModel')
const catchAsync = require('./../util/catchAsync')
const factory = require('./handlerFactory')
const multer = require('multer') // upload images
const sharp = require('sharp') // resize images


// import data from a json file :
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`))


// MULTER (upload images)
const multerStorage = multer.memoryStorage()

// Only allow images files
const multerFilter = (req, file, callback) => {
    if (file.mimetype.startsWith('image')) {
        callback(null, true)
    } else {
        callback(new AppError('Not an image. Please upload only images', 400), false)
    }
}

// Create function to upload images (multer)
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 }
])

exports.resizeTourImages = catchAsync( async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next()
    
    // 1. Cover Images
    const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`
    await sharp(req.files.imageCover[0].buffer)
        .resize(200, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90}) 
        .toFile(`public/img/tours/${imageCoverFilename}`)   

    // Put the imageCoverFilename into the request body so it's updated when we call updateOne()
    req.body.imageCover = imageCoverFilename 

    // 2. Images
    req.body.images = []

    // We use .map() to save the promises of sharp and then await them all with Promise.all()
    await Promise.all(
        req.files.images.map(async (img, idx) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${idx+1}.jpeg`

            await sharp(img.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 80}) 
                .toFile(`public/img/tours/${filename}`)   

            // Push the images in the array images in the request body
            req.body.images.push(filename)
         })
    )
    next()
})

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5'
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
    next()
}

// FACTORIZED
exports.getAllTours = factory.getAll(Tour)
exports.getTour = factory.getOne(Tour, {path: 'reviews'})
exports.createTour = factory.createOne(Tour)
exports.updateTour = factory.updateOne(Tour)
exports.deleteTour = factory.deleteOne(Tour)


// AGGREGATION PIPELINE EXEMPLES

// Methode MongoDB qui permet de filter en suivant plusieurs etapes
// Arguments : tableau avec toutes les étapes
// Chaque étape = un objet avec nom de l'étape en proprité

// 1. GET TOUR STATISTICS

exports.getTourStats = catchAsync(async (req, res, next) => {

        const stats = await Tour.aggregate([
            {
                $match: { ratingsAverage: { $gte: 4.5}}
            },
            {
                $group: { 
                    _id: '$difficulty',
                    numOfTours: { $sum: 1 },
                    numOfRatings: { $sum: '$ratingsQuantity'},
                    avgRating: { $avg: '$ratingsAverage'},
                    avgPrice: { $avg: '$price'},
                    minPrice: { $min: '$price'},
                    maxPrice: { $max: '$price'}
                }
            },
            {
                $sort: { avgPrice: 1 } // ordre ascendant
            },
            // {
            //     $match: { _id: { $ne: 'easy'}} // not easy
            // }
        ])

        res.status(200) // 201 stands for 'created'
        .json({
            status:'success',
            data: {
                tour: stats
            }
        })
})

// GET BUSIEST MONTH OF A GIVEN YEAR (route = /monthly-plan/:year )

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {

        const year = +req.params.year 

        const plan = await Tour.aggregate([
            {
                $unwind: '$startDates' // $unwind déconstruit un tableau
            },
            {
                $match: {
                    startDates: {
                        $gte: new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$startDates' },
                    numOfTourStarts: { $sum: 1 },
                    tours: { $push: '$name'} // $push creates an array
                }
            },
            {
                $addFields: { month: '$_id'}
            },
            {
                $project: { // hide fields
                    _id: 0
                }
            },
            {
                $sort: { numOfTourStarts: -1 } // descending order
            }
        ])

        res.status(200) // 201 stands for 'created'
        .json({
            status:'success',
            data: {
                tour: plan
            }
        })
})

// GEOLOC

exports.getTourWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params
    const [lat, lng] = latlng.split(',')

    // mongoDB needs the radius in 'radians' :
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1 // radius of the Earth in miles or km
    
    if (!lat || !lng) {
        next(new AppError('Please provide longitude and latitude in the format lat,lng', 400))
    }

    const tours = await Tour.find({ 
        startLocation: { 
            $geoWithin: { 
                $centerSphere: [[lng, lat], radius]
            }
        }
    })

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    })
})

exports.getDistances = catchAsync( async (req, res, next) => {
    const { latlng, unit } = req.params
    const [lat, lng] = latlng.split(',')
    
    const multiplier = unit === 'mi' ? 0.000621371 : 0.001

    if (!lat || !lng) {
        next(new AppError('Please provide longitude and latitude in the format lat,lng', 400))
    }

    const distances = await Tour.aggregate([
        {
            // Step 1
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1 , lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            },
        },
        {
            // Step 2
            $project: { // fields we want to keep
                distance: 1, 
                name: 1,
            }
        }
    ])

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    })
})