const express = require('express')
const reviewController = require('./../controllers/reviewController')
const authController = require('./../controllers/authController')

const router = express.Router({ mergeParams: true})
// we need to set the option mergeParams to true to get access to the param 'tourId' in the route /tours/tourId/reviews

// Protect routes (only if logged in)
router.use(authController.protect)

router.route('/')
    .get(reviewController.getReviews)
    .post(
        authController.protect,
        authController.restrictTo('user'), 
        reviewController.setTourAndUserIds,
        reviewController.createReview
    )

router.route('/:id')
        .get(reviewController.getReview)
        .delete(
            authController.protect,
            authController.restrictTo('admin', 'user'),
            reviewController.deleteReview)
        .patch(
            authController.protect,
            authController.restrictTo('admin', 'user'),
            reviewController.updateReview)


module.exports = router