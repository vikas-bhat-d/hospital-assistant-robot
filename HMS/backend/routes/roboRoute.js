const express = require('express');
const { getProfileAndToken, bookAppointment } = require('../controllers/userController');
const { allDoctors } = require('../controllers/adminController');
const roboRouter = express.Router();

roboRouter.get("/get-profile-robo", getProfileAndToken)
roboRouter.post("/book-appointment", bookAppointment)
roboRouter.get("/all-doctors",allDoctors)


module.exports= roboRouter;
