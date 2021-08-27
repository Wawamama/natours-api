const express = require('express')
// Using destructuring to get the functions
const { getAllTours, createTour, getTour, updateTour, deleteTour, checkID, checkBody, aliasTopTours, getTourStats, getMonthlyPlan, getTourWithin, getDistances } = require('./../controllers/tourController')
const { protect, restrictTo } = require('./../controllers/authController')
const reviewRouter = require('./reviewRoutes')

const router = express.Router() // Middleware

// We specify the middlewares we want to run for each http request, in order

// Mounts a router for a specific router (a router IS a middleware)
router.use('/:tourId/reviews', reviewRouter)

router.route('/top-5-cheap')
    .get(aliasTopTours, getAllTours)

router.route('/tour-stats')
    .get(getTourStats)   
    
router.route('/monthly-plan/:year')
    .get(
        protect, 
        restrictTo('admin', 'lead-guide', 'guide'), 
        getMonthlyPlan
    )


// Geo spacial

router.route('/tours-within/:distance/center/:latlng/unit/:unit')
        .get(getTourWithin)
// tours-within?distance=230&center=40.98687,32.87695&unit=mil
// tours-within/230/center/40.987877,45.766765/mil

router.route('/distances/:latlng/unit/:unit')
        .get(getDistances)

router.route('/')
    .get(getAllTours) // middleware protect and then getAllTours if authorised
    .post(protect, restrictTo('admin', 'lead-guide'), createTour)

router.route('/:id')
    .get(getTour)
    .patch(
        protect, 
        restrictTo('admin', 'lead-guide'), 
        updateTour
    )
    .delete(
        protect, 
        restrictTo('admin', 'lead-guide'), 
        deleteTour
    )

module.exports = router