const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid/v4');
const qrcode = require('qrcode');
const pdfkit = require('pdfkit-construct');
var protocol = 'http://';
var domain = '192.168.100.10';
var portServer = '4000';

router.get('/updateqr', isLoggedIn, async (req, res) => {
  try {
    const { category } = req.user;
    if (category) {
      const repairsUpdateDB = await pool.query("SELECT code FROM repairs;");
      const routeDirectory = path.join(__dirname, '../public/repairs/');
      fs.access(routeDirectory, (err) => {
        if (err) {
          fs.mkdirSync(routeDirectory);
        } else {
          fs.rmSync(routeDirectory, { recursive: true });
          fs.mkdirSync(routeDirectory);
        };
        var ext = '.jpg';
        var contentQR = protocol + domain + ':' + portServer + '/repairs/consult/';
        for (let key in repairsUpdateDB) {
          qrcode.toFile(routeDirectory + repairsUpdateDB[key].code + ext, contentQR + repairsUpdateDB[key].code, {
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }, function (err) {
            if (err) throw err
          });
        };
        req.toastr.info('QRs actualizados correctamente');
        res.redirect('/enterprises/view');
      });
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  };
});

router.get('/pdf/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const enterpriseDB = await pool.query("SELECT * FROM enterprises;");
    const repairDB = await pool.query("SELECT repairs.*, customers.identification AS identificationCustomer, customers.names AS namesCustomer, customers.lastnames AS lastnamesCustomer, customers.address AS addressCustomer, customers.email AS emailCustomer, customers.contact AS contactCustomer, registeredUser.names AS namesRegisteredUser, registeredUser.lastnames AS lastnamesRegisteredUser, users.identification AS identificationTechnical, users.image AS imageTechnical, users.names AS namesTechnical, users.lastnames AS lastnamesTechnical, users.address AS addressTechnical, users.email AS emailTechnical, users.contact AS contactTechnical, users.active AS statusTechnical FROM repairs JOIN users ON repairs.idTechnical=users.id JOIN customers ON repairs.idCustomer=customers.id JOIN users AS registeredUser ON repairs.idRegisteredUser=registeredUser.id WHERE repairs.id=?;", [id]);
    const doc = new pdfkit({
      size: 'A4'
    });
    const filename = `Reparación ${Date.now()}.pdf`;
    const stream = res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-disposition': `attachment; filename=${filename}`
    });
    doc.on('data', (data) => { stream.write(data) });
    doc.on('end', () => { stream.end() });
    doc.fontSize(14).font('Helvetica-Bold').text('NOTA DE REPARACIÓN', {
      align: 'center'
    });
    doc.fontSize(20).font('Helvetica').text(enterpriseDB[0].name, {
      align: 'center'
    });
    doc.fontSize(14).text(enterpriseDB[0].address, {
      align: 'center'
    });
    doc.text(enterpriseDB[0].contact, {
      align: 'center'
    });
    doc.text(enterpriseDB[0].email, {
      align: 'center'
    });
    let imageWidthQR = 125;
    const routeQR = path.join(__dirname, '../public/repairs/');
    doc.image(routeQR + repairDB[0].code + '.jpg',
      doc.page.width / 2 - imageWidthQR / 2, doc.y, {
      width: imageWidthQR
    });
    doc.end();
  } catch (error) {
    console.error(error);
  };
});

router.get('/add', isLoggedIn, async (req, res) => {
  try {
    const { category, id } = req.user;
    if (category) {
      var technicalDB = await pool.query("SELECT id, names, lastnames FROM users WHERE active=1 ORDER BY lastnames ASC, names ASC;");
    } else {
      var technicalDB = await pool.query("SELECT id, names, lastnames FROM users WHERE id=? ORDER BY lastnames ASC, names ASC;", [id]);
    };
    var methodsPaymentsDB = await pool.query("SELECT * FROM methodsPayments ORDER BY name;");
    res.render('repairs/add', { technicalDB, methodsPaymentsDB });
  } catch (error) {
    console.error(error);
  };
});

router.post('/add', isLoggedIn, async (req, res) => {
  try {
    const { identification, names, lastnamesCustomer, address, emailCustomer, contact } = req.body;
    const { brand, model, serie, colorPrimary, colorSecondary, statusDevice } = req.body;
    const { reason, observation } = req.body;
    const statusRepair = 1;
    const idCustomerDB = await pool.query("SELECT id FROM customers WHERE identification=?;", [identification]);
    const { id } = req.user;
    const { idTechnical } = req.body;
    const { costRepair, paymentRepair, idMethodPayment } = req.body;
    var idCustomer;
    if (idCustomerDB.length > 0) {
      idCustomer = idCustomerDB[0].id;
    } else {
      let newCustomer = { identification, names, lastnames: lastnamesCustomer, address, email: emailCustomer, contact };
      const customerInsert = await pool.query("INSERT INTO customers SET ? ", newCustomer);
      idCustomer = customerInsert.insertId;
    };
    let newEquipment = { brand, model, serie, colorPrimary, colorSecondary, statusDevice, idCustomer };
    const equipmentInsert = await pool.query("INSERT INTO equipments SET ? ", newEquipment);
    idEquipment = equipmentInsert.insertId;
    var observationIDB = 'Ninguna';
    var observationIDBRepairs;
    if (observation.length > 0) {
      observationIDBRepairs = observation;
    } else {
      observationIDBRepairs = observationIDB;
    };
    var ext = '.jpg';
    var codeRepair = uuid();
    var contentQR = protocol + domain + ':' + portServer + '/repairs/consult/' + codeRepair;
    let newRepair = { code: codeRepair, reason, status: statusRepair, observation: observationIDBRepairs, idEquipment, idCustomer, idRegisteredUser: id, idTechnical };
    const repairInsert = await pool.query("INSERT INTO repairs SET ? ", newRepair);
    idRepair = repairInsert.insertId;
    const route = path.join(__dirname, '../public/repairs/');
    fs.access(route, (err) => {
      if (err) {
        fs.mkdirSync(route);
      };
    });
    qrcode.toFile(route + codeRepair + ext, contentQR, {
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }, function (err) {
      if (err) throw err
    });
    var costRepairValidation;
    if (costRepair.length > 0) {
      costRepairValidation = costRepair;
      var reasonCost = 'Servicio de reparación';
      let newCostRepair = { value: costRepairValidation, reason: reasonCost, observation: observationIDB, idRepair, idRegisteredUser: id };
      await pool.query("INSERT INTO costsRepairs SET ? ", newCostRepair);
    } else {
      costRepairValidation = 0;
    };
    var paymentRepairValidation;
    if (paymentRepair.length > 0) {
      paymentRepairValidation = paymentRepair;
      let newPaymentRepair = { value: paymentRepairValidation, observation: observationIDB, idMethodPayment, idRepair, idRegisteredUser: id };
      await pool.query("INSERT INTO paymentsRepairs SET ? ", newPaymentRepair);
    } else {
      paymentRepairValidation = 0;
    };
    if (costRepair.length > 0 || paymentRepair.length > 0) {
      const pendingRepair = parseFloat(costRepairValidation) - parseFloat(paymentRepairValidation);
      let newBalance = { cost: costRepairValidation, paid: paymentRepairValidation, pending: pendingRepair.toFixed(2), idRepair };
      await pool.query("INSERT INTO balancesRepairs SET ? ", newBalance);
    };
    req.toastr.info('Reparación guardada correctamente');
    res.redirect('/repairs');
  } catch (error) {
    console.error(error);
  };
});

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const idUserLogin = req.user.id;
    const repairsUsers = await pool.query("SELECT userLogin.category AS categoryUserLogin, users.identification AS identificationTechnical, users.image AS imageTechnical, users.names AS namesTechnical, users.lastnames AS lastnamesTechnical, users.address AS addressTechnical, users.email AS emailTechnical, users.contact AS contactTechnical, users.active AS statusTechnical, if(users.active=1, 'Activo', 'Inactivo') AS statusTechnicalText, repairs.*, repairs.status, if(repairs.status=1, 'Pendiente', if(repairs.status=2, 'En reparación', if(repairs.status=3, 'Culminada', if(repairs.status=4, 'En taller', 'Entregada a cliente')))) AS statusText, customers.identification AS identificationCustomer, customers.names AS namesCustomer, customers.lastnames AS lastnamesCustomer, customers.address AS addressCustomer, customers.email AS emailCustomer, customers.contact AS contactCustomer, registeredUser.names AS namesRegisteredUser, registeredUser.lastnames AS lastnamesRegisteredUser FROM repairs JOIN users ON repairs.idTechnical=users.id JOIN customers ON repairs.idCustomer=customers.id JOIN users AS registeredUser ON repairs.idRegisteredUser=registeredUser.id JOIN users AS userLogin WHERE userLogin.id=? ORDER BY users.lastnames ASC, users.names ASC, repairs.joined ASC;", [idUserLogin]);
    res.render('repairs/list', { repairsUsers });
  } catch (error) {
    console.error(error);
  };
});

router.get('/view/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const repairDB = await pool.query("SELECT repairs.*, customers.identification AS identificationCustomer, customers.names AS namesCustomer, customers.lastnames AS lastnamesCustomer, customers.address AS addressCustomer, customers.email AS emailCustomer, customers.contact AS contactCustomer, registeredUser.names AS namesRegisteredUser, registeredUser.lastnames AS lastnamesRegisteredUser, users.identification AS identificationTechnical, users.image AS imageTechnical, users.names AS namesTechnical, users.lastnames AS lastnamesTechnical, users.address AS addressTechnical, users.email AS emailTechnical, users.contact AS contactTechnical, users.active AS statusTechnical FROM repairs JOIN users ON repairs.idTechnical=users.id JOIN customers ON repairs.idCustomer=customers.id JOIN users AS registeredUser ON repairs.idRegisteredUser=registeredUser.id WHERE repairs.id=?;", [id]);
    if (repairDB.length > 0) {
      const equipmentDB = await pool.query("SELECT * FROM equipments WHERE id=?;", [repairDB[0].idEquipment]);
      const costsRepairDB = await pool.query("SELECT costsRepairs.value AS valueCostRepair, costsRepairs.reason AS reasonCostRepair, costsRepairs.observation AS observationCostRepair, costsRepairs.joined AS joinedCostRepair, users.names AS namesRegisteredUserCostRepair, users.lastnames AS lastnamesRegisteredUserCostRepair FROM costsRepairs JOIN repairs ON costsRepairs.idRepair=repairs.id JOIN users ON costsRepairs.idRegisteredUser=users.id WHERE repairs.id=? ORDER BY costsRepairs.joined ASC;", [id]);
      const paymentsRepairDB = await pool.query("SELECT paymentsRepairs.value AS valuePaymentRepair, paymentsRepairs.joined AS joinedPaymentRepair, paymentsRepairs.observation AS observationPaymentRepair, methodsPayments.name AS methodPayment, users.names AS namesRegisteredUserPaymentRepair, users.lastnames AS lastnamesRegisteredUserPaymentRepair FROM paymentsRepairs JOIN methodsPayments ON paymentsRepairs.idMethodPayment=methodsPayments.id JOIN repairs ON paymentsRepairs.idRepair=repairs.id JOIN users ON paymentsRepairs.idRegisteredUser=users.id WHERE repairs.id=? ORDER BY paymentsRepairs.joined ASC;", [id]);
      const balanceRepairDB = await pool.query("SELECT id, ROUND(COALESCE(cost,0),2) AS cost, ROUND(COALESCE(paid,0),2) AS paid, ROUND(COALESCE(pending,0),2) AS pending, SUM(idRepair) AS idRepair FROM balancesRepairs WHERE idRepair=?;", [id]);
      const methodsPaymentsDB = await pool.query("SELECT * FROM methodsPayments ORDER BY name;");
      const idUserLogin = req.user.id;
      var buttonChange;
      if (idUserLogin == repairDB[0].idTechnical) {
        buttonChange = true;
      } else {
        buttonChange = false;
      };
      const answerDB = await pool.query("SELECT receive FROM answers WHERE idRepair=?;", [id]);
      var receiveView;
      if (answerDB.length > 0) {
        receiveView = answerDB[0].receive;
      } else {
        receiveView = false;
      };
      res.render('repairs/view', { repair: repairDB[0], equipment: equipmentDB[0], paymentsRepairDB, costsRepairDB, balanceRepair: balanceRepairDB[0], methodsPaymentsDB, buttonChange, receiveView });
    } else {
      res.redirect('/404');
    };
  } catch (error) {
    console.error(error);
  }
});

router.post('/view/:id/updatestatus', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const repairDB = await pool.query("SELECT status, code FROM repairs WHERE repairs.id=?;", [id]);
    if (repairDB[0].status == 1) {
      await pool.query("UPDATE repairs SET status=? WHERE id=?;", [2, id]);
      req.toastr.info('Estado actualizado correctamente');
    };
    if (repairDB[0].status == 2) {
      await pool.query("UPDATE repairs SET status=? WHERE id=?;", [3, id]);
      req.toastr.info('Estado actualizado correctamente');
    };
    if (repairDB[0].status == 3) {
      await pool.query("UPDATE repairs SET status=? WHERE id=?;", [4, id]);
      req.toastr.info('Estado actualizado correctamente');
    };
    if (repairDB[0].status == 4) {
      const balanceRepairDB = await pool.query("SELECT * FROM balancesRepairs WHERE idRepair=?;", [id]);
      if (balanceRepairDB.length > 0) {
        if (balanceRepairDB[0].pending > 0) {
          req.toastr.warning('Antes cobre los ' + balanceRepairDB[0].pending + ' pendientes');
        };
        if (balanceRepairDB[0].pending < 0) {
          req.toastr.warning('Existen ' + balanceRepairDB[0].pending + ' de diferencia');
        };
        if (balanceRepairDB[0].pending == 0) {
          const answerDB = await pool.query("SELECT * FROM answers WHERE idRepair=?;", [id]);
          if (answerDB.length > 0) {
            await pool.query("UPDATE answers SET receive=?, answerTechnical=? WHERE idRepair=?;", [true, false, id]);
          } else {
            let newAnswer = { receive: true, answerTechnical: false, idRepair: id };
            await pool.query("INSERT INTO answers SET ? ", newAnswer);
          };
          req.toastr.info('Espere a que el cliente acepte o rechace la recepción');
          res.redirect('/repairs/view/' + id);
        };
      } else {
        req.toastr.warning('No existen valores');
      };
    };
    res.redirect('/repairs/view/' + id);
  } catch (error) {
    console.error(error);
  };
});

router.get('/consult/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const repairconsultDB = await pool.query("SELECT repairs.*, equipments.brand AS brandEquipment, equipments.model AS modelEquipment, equipments.serie AS serieEquipment, equipments.colorPrimary AS colorPrimaryEquipment, equipments.colorSecondary AS colorSecondaryEquipment, customers.names AS namesCustomer, customers.lastnames AS lastnamesCustomer, users.image AS imageTechnical, users.names AS namesTechnical, users.lastnames AS lastnamesTechnical FROM repairs JOIN equipments ON repairs.idEquipment=equipments.id JOIN customers ON repairs.idCustomer=customers.id JOIN users ON repairs.idTechnical=users.id WHERE code=?;", [code]);
    const answerDB = await pool.query("SELECT * FROM answers WHERE idRepair=?;", [repairconsultDB[0].id]);
    var receive;
    if (answerDB.length > 0) {
      receive = answerDB[0].receive;
    } else {
      receive = false;
    };
    res.render('repairs/consult', { repairconsult: repairconsultDB[0], receive });
  } catch (error) {
    console.error(error);
  };
});

router.post('/consult/:code/accept', async (req, res) => {
  try {
    const { code } = req.params;
    const idRepairtDB = await pool.query("SELECT id FROM repairs WHERE code=?;", [code]);
    const answerDB = await pool.query("SELECT answerTechnical FROM answers WHERE idRepair=?;", [idRepairtDB[0].id]);
    if (answerDB.length > 0) {
      if (answerDB[0].answerTechnical) {
        req.toastr.error('La entrega ha sido cancelada');
      } else {
        await pool.query("UPDATE repairs SET status=?, delivered=curtime() WHERE id=?;", [5, idRepairtDB[0].id]);
        await pool.query("DELETE FROM answers WHERE idRepair=?;", [idRepairtDB[0].id]);
        req.toastr.info('Equipo recibido');
      };
    };
    res.redirect('/repairs/consult/' + code);
  } catch (error) {
    console.error(error);
  };
});

router.post('/consult/:code/reject', async (req, res) => {
  try {
    const { code } = req.params;
    const idRepairtDB = await pool.query("SELECT id FROM repairs WHERE code=?;", [code]);
    const answerDB = await pool.query("SELECT receive FROM answers WHERE idRepair=?;", [idRepairtDB[0].id]);
    if (answerDB.length > 0) {
      await pool.query("UPDATE answers SET receive=? WHERE idRepair=?;", [false, idRepairtDB[0].id]);
      req.toastr.info('Equipo rechazado');
    };
    res.redirect('/repairs/consult/' + code);
  } catch (error) {
    console.error(error);
  };
});

router.post('/consult/:code/cancel', async (req, res) => {
  try {
    const { code } = req.params;
    const idRepairtDB = await pool.query("SELECT id FROM repairs WHERE code=?;", [code]);
    const answersDB = await pool.query("SELECT receive FROM answers WHERE idRepair=?;", [idRepairtDB[0].id]);
    if (answersDB.length > 0) {
      await pool.query("UPDATE answers SET receive=?, answerTechnical=? WHERE idRepair=?;", [false, true, idRepairtDB[0].id]);
      req.toastr.info('Entrega cancelada');
    } else {
      req.toastr.error('Cliente ha aceptado la entrega');
    };
    res.redirect('/repairs/view/' + idRepairtDB[0].id);
    console.log(idRepairtDB[0].id);
  } catch (error) {
    console.error(error);
  };
});

router.post('/view/:id/addcost', isLoggedIn, async (req, res) => {
  try {
    const { valueCost, reasonCost, observationCost } = req.body;
    const { id } = req.params;
    const idUser = req.user.id;
    var observation = 'Ninguna';
    var observationIDBCost;
    if (observationCost.length > 0) {
      observationIDBCost = observationCost;
    } else {
      observationIDBCost = observation;
    };
    var costRepair;
    if (valueCost.length > 0) {
      costRepair = valueCost;
      let newCost = { value: costRepair, reason: reasonCost, observation: observationIDBCost, idRepair: id, idRegisteredUser: idUser };
      await pool.query("INSERT INTO costsRepairs SET ? ", newCost);
      const balanceRepairDB = await pool.query("SELECT * FROM balancesRepairs WHERE idRepair=? ", [id]);
      if (balanceRepairDB.length > 0) {
        const newCostBalance = parseFloat(balanceRepairDB[0].cost) + parseFloat(valueCost);
        const newPendingBalance = parseFloat(newCostBalance) - parseFloat(balanceRepairDB[0].paid);
        let updateBalance = { cost: newCostBalance, pending: newPendingBalance.toFixed(2) };
        await pool.query("UPDATE balancesRepairs SET ? WHERE id=?;", [updateBalance, balanceRepairDB[0].id]);
      } else {
        const paidBalance = 0;
        const pendingRepair = parseFloat(costRepair) - parseFloat(paidBalance);
        let newBalance = { cost: costRepair, paid: paidBalance, pending: pendingRepair.toFixed(2), idRepair: id };
        await pool.query("INSERT INTO balancesRepairs SET ? ", newBalance);
      };
      req.toastr.info('Costo ingresado correctamente');
      res.redirect('/repairs/view/' + id);
    } else {
      req.toastr.warning('Sin valor de costo que ingresar');
      res.redirect('/repairs/view/' + id);
    };
  } catch (error) {
    console.error(error);
  };
});

router.post('/view/:id/addpayment', isLoggedIn, async (req, res) => {
  try {
    const { valuePayment, idMethodPayment, observationPayment } = req.body;
    const { id } = req.params;
    const idUser = req.user.id;
    var observation = 'Ninguna';
    var observationIDBPayment;
    if (observationPayment.length > 0) {
      observationIDBPayment = observationPayment;
    } else {
      observationIDBPayment = observation;
    };
    var paymentRepair;
    if (valuePayment.length > 0) {
      paymentRepair = valuePayment;
      let newPayment = { value: paymentRepair, observation: observationIDBPayment, idMethodPayment, idRepair: id, idRegisteredUser: idUser };
      await pool.query("INSERT INTO paymentsRepairs SET ? ", newPayment);
      const balanceRepairDB = await pool.query("SELECT * FROM balancesRepairs WHERE idRepair=? ", [id]);
      if (balanceRepairDB.length > 0) {
        const newPaymentBalance = parseFloat(balanceRepairDB[0].paid) + parseFloat(valuePayment);
        const newPendingBalance = parseFloat(balanceRepairDB[0].cost) - parseFloat(newPaymentBalance);
        let updateBalance = { paid: newPaymentBalance, pending: newPendingBalance.toFixed(2) };
        await pool.query("UPDATE balancesRepairs SET ? WHERE id=?;", [updateBalance, balanceRepairDB[0].id]);
      } else {
        const costBalance = 0;
        const pendingRepair = parseFloat(costBalance) - parseFloat(paymentRepair);
        let newBalance = { cost: costBalance, paid: paymentRepair, pending: pendingRepair.toFixed(2), idRepair: id };
        await pool.query("INSERT INTO balancesRepairs SET ? ", newBalance);
      };
      req.toastr.info('Pago ingresado correctamente');
      res.redirect('/repairs/view/' + id);
    } else {
      req.toastr.warning('Sin valor de pago que ingresar');
      res.redirect('/repairs/view/' + id);
    };
  } catch (error) {
    console.error(error);
  };
});

router.get('/edit/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await pool.query("SELECT * FROM users WHERE id=?;", [id]);
    res.render('users/edit', { updateUser: user[0] });
  } catch (error) {
    console.error(error);
  }
});

router.get('/delete/:id', isLoggedIn, async (req, res) => {
  try {
    const { category } = req.user;
    const { id } = req.params;
    if (category) {
      const idEquipmentDB = await pool.query("SELECT idEquipment FROM repairs WHERE id=?;", [id]);
      const repairCodeDB = await pool.query("SELECT code FROM repairs WHERE id=?;", [id]);
      await pool.query("DELETE FROM costsRepairs WHERE idRepair=?;", [id]);
      await pool.query("DELETE FROM paymentsRepairs WHERE idRepair=?;", [id]);
      await pool.query("DELETE FROM balancesRepairs WHERE idRepair=?;", [id]);
      await pool.query("DELETE FROM answers WHERE idRepair=?;", [id]);
      await pool.query("DELETE FROM repairs WHERE id=?;", [id]);
      await pool.query("DELETE FROM equipments WHERE id=?;", [idEquipmentDB[0].idEquipment]);
      const routeDirectory = path.join(__dirname, '../public/repairs/');
      fs.rmSync(routeDirectory + repairCodeDB[0].code + '.jpg', { recursive: true });
      req.toastr.info('Reparación eliminada correctamente');
      res.redirect('/repairs');
    } else {
      req.toastr.error('No tienes permiso para realizar esta acción');
      res.redirect('/profile');
    };
  } catch (error) {
    console.error(error);
  };
});

module.exports = router; 