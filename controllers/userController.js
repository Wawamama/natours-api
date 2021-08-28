const AppError = require('../util/appError')
const User = require('./../models/userModel')
const catchAsync = require('./../util/catchAsync')
const factory = require('./handlerFactory')
const multer = require('multer') // upload images
const sharp = require('sharp') // resize images


// Multer : upload images

// Store the image
// const multerStorage = multer.diskStorage({
//     destination: (req, file, callback) => {
//         callback(null, 'public/img/users')
//     },
//     filename: (req, file, callback) => {
//         // user-userid-timestamp.jpg -> guarantee no image has the same name
//         const extension = file.mimetype.split('/')[1] // mimetype : image/jpeg
//         callback(null, `user-${req.user.id}-${Date.now()}.${extension}`)
//     }
// })
// UPDATED WHEN WE CREATED THE RESIZE FUNCTION WITH SHARP so the image is saved in a buffer
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

// Middleware to upload photo from the field in the html form (with name of 'photo')
exports.uploadUserPhoto = upload.single('photo');

// Middleware to resize photos
exports.resizeUserPhoto = catchAsync( async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90}) 
        .toFile(`public/img/users/${req.file.filename}`)   

    next()
})

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

    console.log(req.file)
    
    // 1. Create error if user tries to update the password (Post password data)
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not for password updates. Please use /updatePassword', 400))
    }
    // 2. Update user document
    // Here we can use findByIdAndUpdate (because no sensitive data !!!)

    // We filter the body so user can only change NAME and EMAIL and NOTHING ELSE in req.body
    const filteredBody = filterObj(req.body, 'name', 'email')

    // update filename of the photo if user updates his photo
    if (req.file) filteredBody.photo = req.file.filename

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




