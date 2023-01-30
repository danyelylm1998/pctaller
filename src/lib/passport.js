const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../database');
const helpers = require('./helpers');

passport.use('local.signin', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, username, password, done) => {
  const rows = await pool.query('SELECT * FROM users WHERE username=?', [username]);
  if (rows.length > 0) {
    const user = rows[0];
    const validPassword = await helpers.matchPassword(password, user.password)
    if (user.active) {
      if (validPassword) {
        done(null, user, req.toastr.success('Bienvenido ' + user.names + ' ' + user.lastnames));
      } else {
        done(null, false, req.toastr.error('Contraseña incorrecta'));
      };
    } else {
      done(null, false, req.toastr.error('Usuario bloqueado, contáctese con el administrador'));
    };
  } else {
    return done(null, false, req.toastr.error('El usuario no existe o está incorrecto'));
  };
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const rows = await pool.query("SELECT * FROM users WHERE id=?;", [id]);
  done(null, rows[0]);
});