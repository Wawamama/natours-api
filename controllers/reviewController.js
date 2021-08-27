const AppError = require('../util/appError')
const Review = require('./../models/reviewModel')
// const catchAsync = require('./../util/catchAsync')
const factory = require('./handlerFactory')

//// Middleware to allow nested routes
exports.setTourAndUserIds = (req, res, next) => {
    if(!req.body.refTour) req.body.refTour = req.params.tourId
    if(!req.body.refUser) req.body.refUser = req.user.id
    next()
}

exports.getReviews = factory.getAll(Review)
exports.createReview = factory.createOne(Review)
exports.deleteReview = factory.deleteOne(Review)
exports.updateReview = factory.updateOne(Review)
exports.getReview = factory.getOne(Review)