const crypto = require('crypto')
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

// SCHEMA
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Username required'],
        trim: true,
        maxlength: [20, 'User name must not exceed 20 characters.'],
        minlength: [4, 'Username must have 4 characters minimum.'],
    },
    email: {
        type: String,
        required: [true, 'Email required'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please enter a valid email adress']
    },
    photo: {
        type: String
    },
    role: {
        type: String,
        enum: ['admin', 'user', 'guide', 'lead-guide'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Password required'],
        minlength: [8, 'Password must have 8 characters minimum.'],
        select: false
    },
    passwordChangedAt: {
        type: Date
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Password confirm required'],
        validate: {
            validator: function(val) {
                // 'this' only points to current doc on CREATE and SAVE (doesn't work on updates!)
                return val === this.password 
            },
            message: 'Confirmed password must be the same'
        }
    },
    passwordResetToken: String,
    passwordResetExpires : Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
    
})

// Middlewares

// Password encryption :
userSchema.pre('save', async function(next) {
    // if the password is not modified we just exit the middleware
    if(!this.isModified('password')) return next()
    // Encrypt using bcrypt (salt of 12 is standard (in 2021))
    this.password = await bcrypt.hash(this.password, 12)
    // Delete original password
    this.passwordConfirm = undefined
    next()
})

// Save passwordChangedAt property when password is modified
userSchema.pre('save', function(next) {
    // on exit le middleware si le mdp n'est pas modifié ou si c'est un nouveau doc créé
    if (!this.isModified('password') || this.isNew) return next()

    this.passwordChangedAt = Date.now() - 1000; 
    // on ajoute 1 sec car parfois le token s'enregistre avec un leger décalage
    next()
})

// Don't show inactive users in getUsers
userSchema.pre(/^find/, function(next) {
    // 'this' points to the current querry
    this.find({ active: {$ne: false}})
    next()
})

// INSTANCE METHODS 

// Instance Method (method available for all documents) to CHECK PASSWORD
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

// Instance Method to check if user changed his password after JWT was issued 
// used in authController.js
userSchema.methods.changedPasswordAfterJWT = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        )
        return JWTTimestamp < changedTimestamp // boolean
    }
    // Default (false means NOT changed)
    return false
}

// Instance Method to generate token for reset password middleware
userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex')

    // crypto is a built in module in node (see documentation)
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')
    
    console.log({resetToken}, this.passwordResetToken)

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10min

    return resetToken
}



// CREATE MODEL
const User = mongoose.model('User', userSchema)

module.exports = User;