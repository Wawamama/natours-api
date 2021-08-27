const mongoose = require('mongoose')
const Tour = require('./tourModel')

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review cannot be empty']
    },
    rating: {
        type: Number,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0']
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    refTour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour']
    },
    refUser: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user']
    }
},
{
    // Options
    toJSON: { virtuals: true},
    toObject: { virtuals: true}
})

// Create index for each combinaison of tour/user
reviewSchema.index( {refTour:1, refUser: 1}, {unique: true})

// Populate refUser and tourUser
reviewSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'refUser',
        select: 'name photo'
    })
    // .populate({
    //     path: 'refTour',
    //     select: 'name'
    // })
    
    next()
})

// Static method
reviewSchema.statics.calcAverageRatings = async function(tourId) {
    // this points to the model
    const stats = await this.aggregate([
        {
            $match: { refTour: tourId}
        },
        {
            $group: {
                _id: '$refTour',
                nRating: { $sum: 1},
                avgRating: { $avg : '$rating'}
            }
        }
    ])

    if(stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        })
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        })
    }

}

// Use static method calcAverageRatings as a post middleware after .save
reviewSchema.post('save', async function() {
    // this points to current review. this.constructor points to the model
    await this.constructor.calcAverageRatings(this.refTour)
})

// Pre middlewares for using calcAverageRatings after a review is UPDATED or DELETED
reviewSchema.pre(/^findOneAnd/, async function(next) {
    // this points to the current query
     this.r = await this.findOne()
    next()
})

reviewSchema.post(/^findOneAnd/, async function(next) {
    // this.findOne() doesn't work here, query has already executed
   await this.r.constructor.calcAverageRatings(this.r.refTour)
})


const Review = mongoose.model('Review', reviewSchema)

module.exports = Review

// POST /tour/tourId765757/reviews
// GET /tour/tourId765757/reviews
// GET /tour/tourId765757/reviews/reviewId876985

