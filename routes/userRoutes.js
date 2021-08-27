const express = require('express')
const userController = require('./../controllers/userController')
const authController = require('./../controllers/authController')

const router = express.Router()

router.post('/signup', authController.signUp)
router.post('/login', authController.login)
router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword)

// Protect ALL the routes after this point (middleware runs in sequence)
// instead of calling authController.protect on each one
router.use(authController.protect)

router.patch('/updateMyPassword', 
    authController.updatePassword
)

router.get('/me', 
    userController.getMe, 
    userController.getUser
)

router.patch('/updateMe', 
    userController.updateMe
)
router.delete('/deleteMe', 
    userController.deleteMe
)

// RESTRICT ALL THE FOLLOWING ROUTES TO ADMINS

router.use(authController.restrictTo('admin'))

router.route('/')
    .get(userController.getAllUsers)
    // .post(userController.createUser) users are created using signUp

router.route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser)

module.exports = router