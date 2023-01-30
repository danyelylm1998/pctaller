const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isLoggedIn, isNotLoggedIn } = require('../lib/auth');
const pool = require('../database');

router.get('/signin', isNotLoggedIn, (req, res) => {
  res.render('auth/signin');
});

router.post('/signin', isNotLoggedIn, (req, res, next) => {
  const errors = req.validationErrors();
  if (errors.length > 0) {
    res.redirect('/signin');
  }
  passport.authenticate('local.signin', {
    successRedirect: '/profile',
    failureRedirect: '/signin',
    failureFlash: true
  })(req, res, next);
});

router.get('/logout', (req, res) => {
  req.logOut();
  res.redirect('/');
});

router.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.user;
    const repairsUserDB = await pool.query("SELECT COALESCE(SUM(IF(status=1,1,0)),0) AS pendiente, COALESCE(SUM(IF(status=2,1,0)),0) AS proceso, COALESCE(SUM(IF(status=3,1,0)),0) AS terminada, COALESCE(SUM(IF(status=4,1,0)),0) AS taller, COALESCE(SUM(IF(status=5,1,0)),0) AS entregada FROM repairs WHERE idTechnical=?;", [id]);
    const balancesUsersDB = await pool.query("SELECT ROUND(COALESCE(SUM(balancesRepairs.cost),0),2) AS cost, ROUND(COALESCE(SUM(balancesRepairs.paid),0),2) AS paid, ROUND(COALESCE(SUM(balancesRepairs.pending),0),2) AS pending FROM repairs JOIN users ON repairs.idTechnical=users.id JOIN balancesRepairs ON repairs.id=balancesRepairs.idRepair WHERE users.id=?;", [id]);
    const repairsUserTotalDB = await pool.query("SELECT COUNT(*) AS totalRepairs FROM repairs WHERE idTechnical=?;", [id]);
    res.render('profile', { repairsUser: repairsUserDB[0], balancesUsers: balancesUsersDB[0], repairsUserTotal: repairsUserTotalDB[0] });
  } catch (error) {
    console.error(error);
  };
});

module.exports = router;