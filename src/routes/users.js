const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');
const helpers = require('../lib/helpers');
const fsExtra = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');
const storage = multer.memoryStorage();
const uploads = multer({ storage });
const fs = require('fs');
const uuid = require('uuid/v4');

router.get('/view/:id', isLoggedIn, async (req, res) => {
  try {
    const { category } = req.user;
    if (category) {
      const { id } = req.params;
      const userViewDB = await pool.query("SELECT *, if(category=1, 'Administrador', 'Técnico') AS categoryText , if(active=1, 'Activo', 'Inactivo') AS activeText FROM users WHERE id=?;", [id]);
      if (userViewDB.length > 0) {
        const idUserLogin = req.user.id;
        const repairsUserViewCountDB = await pool.query("SELECT COALESCE(SUM(IF(status=1,1,0)),0) AS pendiente, COALESCE(SUM(IF(status=2,1,0)),0) AS proceso, COALESCE(SUM(IF(status=3,1,0)),0) AS terminada, COALESCE(SUM(IF(status=4,1,0)),0) AS taller, COALESCE(SUM(IF(status=5,1,0)),0) AS entregada FROM repairs WHERE idTechnical=?;", [id]);
        const repairsUserViewTotalDB = await pool.query("SELECT COUNT(*) AS totalRepairs FROM repairs WHERE idTechnical=?;", [id]);
        const repairsUserViewDB = await pool.query("SELECT userLogin.category AS categoryUserLogin, repairs.*, repairs.status, if(repairs.status=1, 'Pendiente', if(repairs.status=2, 'En reparación', if(repairs.status=3, 'Culminada', if(repairs.status=4, 'En taller', 'Entregada a cliente')))) AS statusText, customers.identification AS identificationCustomer, customers.names AS namesCustomer, customers.lastnames AS lastnamesCustomer, customers.address AS addressCustomer, customers.email AS emailCustomer, customers.contact AS contactCustomer, registeredUser.names AS namesRegisteredUser, registeredUser.lastnames AS lastnamesRegisteredUser FROM repairs JOIN customers ON repairs.idCustomer=customers.id JOIN users AS registeredUser ON repairs.idRegisteredUser=registeredUser.id JOIN users AS userLogin WHERE idTechnical=? AND userLogin.id=? ORDER BY customers.lastnames ASC, customers.names ASC, repairs.joined ASC;", [id, idUserLogin]);
        const balancesUserDB = await pool.query("SELECT ROUND(COALESCE(SUM(balancesRepairs.cost),0),2) AS cost, ROUND(COALESCE(SUM(balancesRepairs.paid),0),2) AS paid, ROUND(COALESCE(SUM(balancesRepairs.pending),0),2) AS pending FROM repairs JOIN users ON repairs.idTechnical=users.id JOIN balancesRepairs ON repairs.id=balancesRepairs.idRepair WHERE users.id=?;", [id]);
        res.render('users/view', { userView: userViewDB[0], repairsUserViewCount: repairsUserViewCountDB[0], repairsUserViewDB, balancesUser: balancesUserDB[0], repairsUserViewTotal: repairsUserViewTotalDB[0] });
      } else {
        res.redirect('/404');
      };
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  }
});

router.get('/add', isLoggedIn, async (req, res) => {
  try {
    const { category } = req.user;
    if (category) {
      res.render('users/add');
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  };
});

router.post('/add', isLoggedIn, uploads.single('image'), async (req, res) => {
  try {
    const { category } = req.user;
    if (category) {
      const route = path.join(__dirname, '../public/uploads/profile/users/');
      fs.access(route, (err) => {
        if (err) {
          fs.mkdirSync(route);
        };
      });
      var nameImage;
      if (req.file == undefined) {
        nameImage = '8b69b9dc-954a-4d2c-a2d1-a50884de0b9d.png';
      } else {
        var ext = '.jpg';
        nameImage = uuid() + ext;
        await sharp(req.file.buffer)
          .resize({ width: 128, height: 128 })
          .toFile(route + nameImage);
      };
      const { identification, names, lastnames, address, email, contact, username, password, categoryUser, status } = req.body;
      let newUser = { identification, image: nameImage, names, lastnames, address, email, contact, username, password, category: categoryUser, active: status };
      newUser.password = await helpers.encryptPassword(password);
      await pool.query("INSERT INTO users SET ? ", newUser);
      req.toastr.info('Usuario guardado correctamente');
      res.redirect('/users');
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    if (error.code == 'ER_DUP_ENTRY') {
      res.send('El nombre de usuario ya existe, ingrese uno distinto.');
    };
  };
});

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const { category } = req.user;
    if (category) {
      const users = await pool.query("SELECT *, if(category=1, 'Administrador', 'Técnico') AS categoryText, if(active=1, 'Activo', 'Inactivo') AS activeText FROM users ORDER BY lastnames ASC, names ASC;");
      res.render('users/list', { users });
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  };
});

router.get('/edit/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const idUserLogin = req.user.id;
    const { category } = req.user;
    const user = await pool.query("SELECT * FROM users WHERE id=?;", [id]);
    if (user.length > 0) {
      if (idUserLogin == id || category) {
        res.render('users/edit', { updateUser: user[0] });
      } else {
        res.redirect('/404');
      };
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  }
});

router.get('/reset/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const idUserLogin = req.user.id;
    if (idUserLogin == id) {
      res.render('users/reset', { id });
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  }
});

router.get('/pass/:id', isLoggedIn, async (req, res) => {
  try {
    const { category } = req.user;
    if (category) {
      const { id } = req.params;
      const userEditPassDB = await pool.query("SELECT names, lastnames, username FROM users WHERE id=?;", [id]);
      if (userEditPassDB.length > 0) {
        res.render('users/pass', { id, userEditPass: userEditPassDB[0] });
      } else {
        res.redirect('/404');
      };
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  };
});

router.post('/edit/:id', isLoggedIn, uploads.single('image'), async (req, res) => {
  try {
    const idUserLogin = req.user.id;
    const route = path.join(__dirname, '../public/uploads/profile/users/');
    fs.access(route, (err) => {
      if (err) {
        fs.mkdirSync(route);
      };
    });
    const { id } = req.params;
    const nameProfileDB = await pool.query("SELECT image FROM users WHERE id=?", [id]);
    const nameProfile = nameProfileDB[0].image;
    var nameImage;
    if (req.file == undefined) {
      nameImage = nameProfile;
    } else {
      var ext = '.jpg';
      nameImage = uuid() + ext;
      await sharp(req.file.buffer)
        .resize({ width: 128, height: 128 })
        .toFile(route + nameImage);
      if (nameProfile != '8b69b9dc-954a-4d2c-a2d1-a50884de0b9d.png') {
        const routeProfileDelete = path.join(__dirname, '../public/uploads/profile/users/', nameProfile);
        fs.access(routeProfileDelete, (err) => {
          if (!err) {
            fsExtra.unlinkSync(routeProfileDelete);
          };
        });
      };
    };
    const { category } = req.user;
    const { identification, names, lastnames, address, email, contact, username, password, categoryUser, status } = req.body;
    if (category) {
      var updateUser = { identification, image: nameImage, names, lastnames, address, email, contact, username, category: categoryUser, active: status };
      req.toastr.info('Datos de usuario modificados correctamente');
    } else {
      var updateUser = { identification, image: nameImage, names, lastnames, address, email, contact };
      req.toastr.info('Datos de usuario modificados correctamente');
    };
    await pool.query("UPDATE users SET ? WHERE id=?", [updateUser, id]);
    if (idUserLogin == id) {
      res.redirect('/profile');
    } else {
      res.redirect('/users');
    };
  } catch (error) {
    if (error.code == 'ER_DUP_ENTRY') {
      res.send('El nombre de usuario ya existe, ingrese uno distinto.');
    };
  };
});

router.post('/reset/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const passwordDB = await pool.query("SELECT password FROM users WHERE id=?", [id]);
    const passwordUser = passwordDB[0];
    const { password, newPassword, confirmPassword } = req.body;
    const validPassword = await helpers.matchPassword(password, passwordUser.password)
    if (validPassword) {
      if (newPassword == confirmPassword) {
        let updatePassword = { newPassword };
        updatePassword.newPassword = await helpers.encryptPassword(newPassword);
        await pool.query("UPDATE users SET password=? WHERE id=?", [updatePassword.newPassword, id]);
        res.redirect('/logout');
      } else {
        res.send('Los campos no coinciden.');
      };
    } else {
      res.send('La contraseña anterior es incorrecta.');
    };
  } catch (error) {
    console.error(error);
  };
});

router.post('/pass/:id', isLoggedIn, async (req, res) => {
  try {
    const { category } = req.user;
    if (category) {
      const { id } = req.params;
      const userEditPassDB = await pool.query("SELECT names, lastnames FROM users WHERE id=?;", [id]);
      const { newPassword } = req.body;
      pass = await helpers.encryptPassword(newPassword);
      await pool.query("UPDATE users SET password=? WHERE id=?", [pass, id]);
      req.toastr.info('Contraseña de ' + userEditPassDB[0].names + ' ' + userEditPassDB[0].lastnames + ' modificada correctamente');
      res.redirect('/users');
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  };
});

module.exports = router;