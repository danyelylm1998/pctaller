const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');

router.get('/add', isLoggedIn, async (req, res) => {
  try {
    res.render('customers/add');
  } catch (error) {
    console.error(error);
  };
});

router.get('/view/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const customerViewDB = await pool.query("SELECT * FROM customers WHERE id=?;", [id]);
    if (customerViewDB.length > 0) {
      const idUserLogin = req.user.id;
      const repairsCustomerViewCountDB = await pool.query("SELECT COALESCE(SUM(IF(status=1,1,0)),0) AS pendiente, COALESCE(SUM(IF(status=2,1,0)),0) AS proceso, COALESCE(SUM(IF(status=3,1,0)),0) AS terminada, COALESCE(SUM(IF(status=4,1,0)),0) AS taller, COALESCE(SUM(IF(status=5,1,0)),0) AS entregada FROM repairs WHERE idCustomer=?;", [id]);
      const repairsCustomerViewDB = await pool.query("SELECT userLogin.category AS categoryUserLogin, users.identification AS identificationTechnical, users.image AS imageTechnical, users.names AS namesTechnical, users.lastnames AS lastnamesTechnical, users.address AS addressTechnical, users.email AS emailTechnical, users.contact AS contactTechnical, users.active AS statusTechnical, if(users.active=1, 'Activo', 'Inactivo') AS statusTechnicalText, repairs.*, repairs.status, if(repairs.status=1, 'Pendiente', if(repairs.status=2, 'En reparación', if(repairs.status=3, 'Culminada', if(repairs.status=4, 'En taller', 'Entregada a cliente')))) AS statusText, customers.identification AS identificationCustomer, customers.names AS namesCustomer, customers.lastnames AS lastnamesCustomer, customers.address AS addressCustomer, customers.email AS emailCustomer, customers.contact AS contactCustomer, registeredUser.names AS namesRegisteredUser, registeredUser.lastnames AS lastnamesRegisteredUser FROM repairs JOIN users ON repairs.idTechnical=users.id JOIN customers ON repairs.idCustomer=customers.id JOIN users AS registeredUser ON repairs.idRegisteredUser=registeredUser.id JOIN users AS userLogin WHERE idCustomer=? AND userLogin.id=? ORDER BY customers.lastnames ASC, customers.names ASC, repairs.joined ASC;", [id, idUserLogin]);
      const repairsCustomerViewTotalDB = await pool.query("SELECT COUNT(*) AS totalRepairs FROM repairs WHERE idCustomer=?;", [id]);
      const balancesCustomerDB = await pool.query("SELECT ROUND(COALESCE(SUM(balancesRepairs.cost),0),2) AS cost, ROUND(COALESCE(SUM(balancesRepairs.paid),0),2) AS paid, ROUND(COALESCE(SUM(balancesRepairs.pending),0),2) AS pending FROM repairs JOIN customers ON repairs.idCustomer=customers.id JOIN balancesRepairs ON repairs.id=balancesRepairs.idRepair WHERE customers.id=?;", [id]);
      res.render('customers/view', { customerView: customerViewDB[0], repairsCustomerViewCount: repairsCustomerViewCountDB[0], repairsCustomerViewDB, balancesCustomer: balancesCustomerDB[0], repairsCustomerViewTotal: repairsCustomerViewTotalDB[0] });
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  }
});

router.post('/add', isLoggedIn, async (req, res) => {
  try {
    const { identification, names, lastnamesCustomer, address, emailCustomer, contact } = req.body;
    let newCustomer = { identification, names, lastnames: lastnamesCustomer, address, email: emailCustomer, contact };
    await pool.query("INSERT INTO customers SET ? ", newCustomer);
    req.toastr.info('Cliente guardado correctamente');
    res.redirect('/customers');
  } catch (error) {
    if (error.code == 'ER_DUP_ENTRY') {
      res.send('El número de cédula ya existe, ingrese uno distinto.');
    };
  };
});

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const customers = await pool.query("SELECT * FROM customers ORDER BY lastnames ASC, names ASC;");
    res.render('customers/list', { customers });
    console.log(customers);
  } catch (error) {
    console.error(error);
  };
});

router.get('/edit/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await pool.query("SELECT * FROM customers WHERE id=?;", [id]);
    res.render('customers/edit', { updateCustomer: customer[0] });
  } catch (error) {
    console.error(error);
  }
});

router.post('/edit/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const { identification, names, lastnamesCustomer, address, emailCustomer, contact } = req.body;
    var updateCustomer = { identification, names, lastnames: lastnamesCustomer, address, email: emailCustomer, contact };
    await pool.query("UPDATE customers SET ? WHERE id=?", [updateCustomer, id]);
    req.toastr.info('Datos de cliente modificados correctamente');
    res.redirect('/customers');
  } catch (error) {
    if (error.code == 'ER_DUP_ENTRY') {
      res.send('El número de cédula ya existe, ingrese uno distinto.');
    };
  };
});

module.exports = router;