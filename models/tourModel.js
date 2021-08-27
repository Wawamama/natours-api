const mongoose = require('mongoose')
const slugify = require('slugify')
const validator = require('validator')

// Create a tour Schema
const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must have 40 characters max'],
        minlength: [10, 'A tour name must have 10 characters min'],
        // validate: [validator.isAlpha, 'A tour name only accepts letters']
    },
    slug: {
        type: String
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        set: val => Math.round(val * 10) / 10 // 4.6666, 46.666, 47, 4.7
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function(val) {
                // 'this' only points to current doc on NEW document (doesn't work on updates!)
                return val < this.price // Discount must be smaller than price
            },
            message: 'Discount price should be less than regular price'
        }
    },
    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have a group size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'Not a valid difficulty'
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must have a summary'],

    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have an cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false // always hide this field in queries
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        // GeoJSON
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [ // embed !
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
        // Referencing
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
}, {
    // Options
    toJSON: { virtuals: true},
    toObject: { virtuals: true}
})

// VIRTUAL PROPERTIES (not stored in db)

tourSchema.virtual('durationInWeeks').get( function() {
    return this.duration / 7
})

// Virtual populate (create a virtual field to simulate populate)
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'refTour', // where the id is stored in the review Model
    localField: '_id'       // where the id is stored in the tour Model
})

// SET INDEXES FOR PERFORMANCE (on the most queried fields)

tourSchema.index({price:1, ratingsAverage:-1})
tourSchema.index({slug: 1})
tourSchema.index({startLocation: '2dsphere'})


// MIDDLEWARES

// 1. DOCUMENT MIDDLEWARE

// Pre middleware : runs before .save() and .create()
tourSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true})
    next()
})

// Post middleware : runs after all the pre middlewares (argument 'doc' refers to the finished document)
// tourSchema.post('save', function(doc, next) {
//     console.log(doc)
//     next()
// })

// 2. QUERY MIDDLEWARE
// Executed before every .find() query
// We use a regex to execute it before every method that starts with 'find' 
// -> .findOne(), .findOneAndDelete() ect...
tourSchema.pre(/^find/, function(next) {
    this.find({ secretTour: {$ne: true}})
    this.start = Date.now()
    next()
})

// Populate documents (reference)
tourSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    })
    next()
})

tourSchema.post(/^find/, function(docs, next) {
    console.log(`Query took: ${Date.now() - this.start} ms`)
    next()
})



// 3. AGGREGATION MIDDLEWARE
// Add hooks before or after an aggregation
// Exemple : exclude the secret tour in the Tour Stats
// tourSchema.pre('aggregate', function(next) {
//     this.pipeline().unshift( { $match: { secretTour: {$ne: true} }} )
//     // this.pipeline() est un tableau, on ajoute un filtre au début
//     console.log(this.pipeline())
//     next()
// })

// CREATE A MODEL
// Convention to call the models with Capital letter first
const Tour = mongoose.model('Tour', tourSchema)

module.exports = Tour;