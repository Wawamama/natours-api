// FACTORY FUNCTIONS ARE FUNCTIONS THAT RETURN A FUNCTION
// We use them to factor our redondant functions (exemple CRUD operations)

const AppError = require('../util/appError')
const catchAsync = require('./../util/catchAsync')
const APIFeatures = require('./../util/apiFeatures')



exports.deleteOne = (Model) => 
    catchAsync(async (req, res, next) => {

            const doc = await Model.findByIdAndDelete(req.params.id)
        
            if(!doc) {
                return next(new AppError('No doc found', 404))
            }
        
            res
            .status(204) // No Content
            .json({
                status: 'sucess',
                data: null
            })
        })

exports.updateOne = (Model) => 
catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    })

    if(!doc) {
        return next(new AppError('No doc found', 404))
    }

    res.status(200)
    .json({
        status: 'success',
        data: {
            data: doc
        }
    }) 
})

exports.createOne = (Model) =>
    catchAsync(async (req, res, next) => {

    const newDoc = await Model.create(req.body)
    
    res.status(201) // 201 stands for 'created'
        .json({
            status:'success',
            data: {
                data: newDoc
            }
        })
})

exports.getOne = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {

        let query = Model.findById(req.params.id)
        if (populateOptions) query = query.populate(populateOptions)

        const doc = await query
        
        if(!doc) {
            return next(new AppError('No doc found', 404))
        }

        res.status(200).json({
            status: 'success',
            data: {
                doc
            }
        })
})

exports.getAll = (Model) => 
    catchAsync(async (req, res, next) => {

        // To allow for nested GET reviews on tour (hack)
        let filterObj = {}
        if (req.params.tourId) filterObj = { refTour: req.params.tourId}

        // EXECUTE THE QUERY
        const features = new APIFeatures(Model.find(filterObj), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate()
        
        const doc = await features.query
        // .explain() to get performance infos on the query

        // SEND RESPONSE
        res.status(200).json({
            status: 'success',
            results: doc.length,
            data: {
                data: doc
            }
    })
})
    


