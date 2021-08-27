// const { promisify } = require('util') // built in package to promisify functions
const crypto = require('crypto')
const User = require('./../models/userModel')
const catchAsync = require('./../util/catchAsync')
const jwt = require('jsonwebtoken')
const appError = require('./../util/appError')
const sendEmail = require('./../util/email')

const signToken = id => {
    return jwt.sign({id}, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN} )
}

const createAndSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)

    // Create a cookie
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        // secure: true,
        httpOnly: true
    }
    if (process.env.NODE_ENV === 'production') cookiesOptions.secure = true

    res.cookie('jwt', token, cookieOptions)

    // remove password from the output
    user.password = undefined

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}

// Signup function
exports.signUp = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role
    })
    // const newUser = await User.create(req.body)
    createAndSendToken(newUser, 201, res)
})

// Login function
exports.login = catchAsync(async (req, res, next) => {
    const {email, password} = req.body 

    // 1. Check if user entered an email and password
    if (!email || !password) {
        return next(new appError('Please provide email and password', 400))
    }

    // 2. Check if email matches the password

    // The password field is hidden by default (in the Model, select: false)
    // So we need to select it with : .select('+password')
    const user = await User.findOne({ email: email}).select('+password')

    if (!user || !await user.correctPassword(password, user.password)) {
        return next(new appError('Incorrect email or password', 401))
    }

    // 3. Create a token and send respond
    createAndSendToken(user, 200, res)
})

// MIDDLEWARE TO PROTECT THE ROUTES

exports.protect = catchAsync(async(req, res, next) => {

    // 1. GET THE TOKEN
    let token;
    // Standard : passer un header Authorization: "Bearer tokenvalue"
    if (
        req.headers.authorization && 
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1]
    }
    if (!token) {
        return next(new appError('You are not logged in. Please login to get access', 401))
    }

    // 2. VERIFY THE TOKEN
    const decoded = await jwt.verify(token, process.env.JWT_SECRET)
    
    // 3. CHECK IF USER STILL EXISTS
    const freshUser = await User.findById(decoded.id)
    if (!freshUser) {
        return next(new appError('This user no longer exists.', 401))
    }

    // 4. CHECK IF USER CHANGED PASSWORD AFTER TOKEN WAS ISSUED
    if (freshUser.changedPasswordAfterJWT(decoded.iat)) {
        return next(new appError('User recently changed password. Please log in again.', 401))
    }

    // GRANT ACCESS TO PROTECTED ROUTE IF EVERY TEST PASSED
    req.user = freshUser; // -> CRUCIAL STEP : freshUser is now stored in the request object and can be used in the next middlewares
    next()
})

// Restrict users
// We pass arguments (roles) in the function and then
// the function returns the middleware
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin', 'lead-guide'] for ex
        if (!roles.includes(req.user.role)) {
            return next(new appError('You do not have permission to perform this action', 403))
        }
        next()
    }
}

// RESET PASSWORD FUNCTIONNALITY

// Step 1 : forgot password
exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1. Get user based on POSTed email
    const user = await User.findOne({email: req.body.email})
    if (!user) {
        return next(new appError('There is no user with this adress', 404))
    }

    // 2. Generate the random reset token
    const resetToken = user.createPasswordResetToken()
    await user.save( { validateBeforeSave: false}) // very useful option!

    // 3. Send the new token to the user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`

    const message = `Forgot your password? Submit a patch request with your new password and passwordConfirm to :${resetURL}. \n
    If you didn't forget your password please ignore this email`
    
    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10min)',
            message
        })
        res.status(200).json({
            status: 'success',
            message: 'token send to email'
        })
    } catch (err) {
        user.createPasswordResetToken = undefined;
        user.createPasswordResetExpires = undefined;
        await user.save( { validateBeforeSave: false})
        return next(new appError('There was an error sending the email. Try again later', 500))
    }
})


// Step 2 : reset password
exports.resetPassword = catchAsync(async(req, res, next) => {
    // 1. Get user based on the token
    // we compare the token in the url param with the one in the db
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');
    
    const user = await User.findOne({
        passwordResetToken: hashedToken, 
        passwordResetExpires: { $gt: Date.now() }
    })

    // 2. If token has not expired and there is user, set new password
    if (!user) {
        return next(new appError('Token is invalid or expired', 400))
    }

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // we need to use .save() to activate validators
    await user.save()

    // 3. Update changePasswordAt property for the user
    // --> Done in the middleware than runs before .save() (defined in UserModel)

    // 4. Log user in, send JWT
    createAndSendToken(user, 200, res)

})

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1. Get the user
    const user = await User.findById(req.user.id).select('+password')
    // 2. Check if POSTed password is correct
    // we use the instance method we created on the userModel

    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong.', 401));
      }
    // 3. Update the password
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    await user.save()

    // 4. Log user in, send JWT
    createAndSendToken(user, 200, res)
})