const AppError = require('../util/appError')
const User = require('./../models/userModel')
const catchAsync = require('./../util/catchAsync')
const factory = require('./handlerFactory')


const filterObj = (obj, ...allowedFields) => {
    const newObj = {}
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) {
            newObj[el] = obj[el]
        }
    })

    return newObj
}


exports.updateMe = catchAsync(async (req, res, next) => {
    // 1. Create error if user tries to update the password (Post password data)
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not for password updates. Please use /updatePassword', 400))
    }
    // 2. Update user document
    // Here we can use findByIdAndUpdate (because no sensitive data !!!)

    // We filter the body so user can only change NAME and EMAIL and NOTHING ELSE in req.body
    const filteredBody = filterObj(req.body, 'name', 'email')

    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true, 
        runValidators: true
    })

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    })
})

exports.deleteMe = catchAsync( async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false})

    res.status(204).json({
        status: 'success',
        data: null
    })
})

// Middleware to be able to use .getOne for current user
exports.getMe = (req, res, next) => {
    req.params.id = req.user.id
    next()
}

exports.getAllUsers = factory.getAll(User)
exports.getUser = factory.getOne(User)
// exports.createUser not defined because users are created when signUp
exports.deleteUser = factory.deleteOne(User)
exports.updateUser = factory.updateOne(User)