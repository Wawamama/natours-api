const Tour = require('./../models/tourModel')
const APIFeatures = require('./../util/apiFeatures')
const catchAsync = require('./../util/catchAsync')



// import data from a json file :
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`))


exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5'
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
    next()
}

exports.getAllTours = async (req, res) => {
    // console.log(req.requestTime)
    try {

        // console.log(req.query)

        // EXECUTE THE QUERY
        const features = new APIFeatures(Tour.find(), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate()
        
        const tours = await features.query

        //const tours = await finalQuery (old version)

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

exports.createTour = catchAsync(async (req, res, next) => {

    const newTour = await Tour.create(req.body)
    
    res.status(201) // 201 stands for 'created'
        .json({
            status:'success',
            data: {
                tour: newTour
            }
        })
})

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
            message: err
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
// AGGREGATION PIPELINE EXEMPLES

// Methode MongoDB qui permet de filter en suivant plusieurs etapes
// Arguments : tableau avec toutes les étapes
// Chaque étape = un objet avec nom de l'étape en proprité

// 1. GET TOUR STATISTICS

exports.getTourStats = async (req, res) => {
    try {

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
    } catch(err) {
        res.status(400).json({
            status: 'fail',
            message: err
        })
    }
}

// GET BUSIEST MONTH OF A GIVEN YEAR (route = /monthly-plan/:year )

exports.getMonthlyPlan = async (req, res) => {
    try {
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
    } catch(err) {
        res.status(400).json({
            status: 'fail',
            message: err
        })
    }
}