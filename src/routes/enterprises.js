const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');
const fsExtra = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');
const storage = multer.memoryStorage();
const uploads = multer({ storage });
const fs = require('fs');
const uuid = require('uuid/v4');

router.get('/view', isLoggedIn, async (req, res) => {
    try {
        const enterprise = await pool.query("SELECT * FROM enterprises");
        const repairsEnterprisesDB = await pool.query("SELECT COALESCE(SUM(IF(status=1,1,0)),0) AS pendiente, COALESCE(SUM(IF(status=2,1,0)),0) AS proceso, COALESCE(SUM(IF(status=3,1,0)),0) AS terminada, COALESCE(SUM(IF(status=4,1,0)),0) AS taller, COALESCE(SUM(IF(status=5,1,0)),0) AS entregada FROM repairs;");                                // EXPLICADO EN LÍNEAS ANTERIORES
        const balancesEnterpriseDB = await pool.query("SELECT ROUND(COALESCE(SUM(balancesRepairs.cost),0),2) AS cost, ROUND(COALESCE(SUM(balancesRepairs.paid),0),2) AS paid, ROUND(COALESCE(SUM(balancesRepairs.pending),0),2) AS pending FROM repairs JOIN users ON repairs.idTechnical=users.id JOIN balancesRepairs ON repairs.id=balancesRepairs.idRepair;");
        const repairsEnterpriseTotalDB = await pool.query("SELECT COUNT(*) AS totalRepairs FROM repairs;");
        res.render('enterprises/view', { enterprise: enterprise[0], repairsEnterprises: repairsEnterprisesDB[0], balancesEnterprise: balancesEnterpriseDB[0], repairsEnterpriseTotal: repairsEnterpriseTotalDB[0] });
    } catch (error) {
        console.error(error);
    };
});

router.get('/edit/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const { category } = req.user;
        if (category) {
            const enterprise = await pool.query("SELECT * FROM enterprises WHERE enterprises.id=?;", [id]);
            res.render('enterprises/edit', { updateEnterprise: enterprise[0] });
        } else {
            res.redirect('/404');
        };
    } catch (error) {
        console.error(error);
    };
});

router.post('/edit/:id', isLoggedIn, uploads.single('image'), async (req, res) => {
    try {
        const { category } = req.user;
        if (category) {
            const route = path.join(__dirname, '../public/uploads/profile/enterprises/');
            fs.access(route, (err) => {
                if (err) {
                    fs.mkdirSync(route);
                };
            });
            const { id } = req.params;
            const nameLogoDB = await pool.query("SELECT logo FROM enterprises WHERE id=?", [id]);
            const nameLogo = nameLogoDB[0].logo;
            var nameImage;
            if (req.file == undefined) {
                nameImage = nameLogo;
            } else {
                var ext;
                var extForm = path.extname(req.file.originalname);
                if (extForm == '.png' || extForm == '.PNG') {
                    ext = '.png';
                } else {
                    ext = '.jpg';
                };
                fs.access(route, (err) => {
                    if (err) {
                        fs.mkdirSync(route);
                    };
                });

                nameImage = uuid() + ext;
                await sharp(req.file.buffer)
                    .resize({ width: 1000 })
                    .toFile(route + nameImage);
                if (nameLogo != 'fc0d5b72-7518-4e66-85db-6a36f2ea97f9.png') {
                    const routeImageDelete = path.join(__dirname, '../public/uploads/profile/enterprises/', nameLogo);
                    fs.access(routeImageDelete, (err) => {
                        if (!err) {
                            fsExtra.unlinkSync(routeImageDelete);
                        };
                    });
                };
            };
            const { identification, name, address, email, contact } = req.body;
            let updateEnterprise = { identification, name, logo: nameImage, address, email, contact };
            await pool.query("UPDATE enterprises SET ? WHERE id=?", [updateEnterprise, id]);
            req.toastr.info('Datos de empresa modificados correctamente');
            res.redirect('/enterprises/view');
        } else {
            res.redirect('/404');
        };
    } catch (error) {
        if (error == 'Error: Input buffer contains unsupported image format') {
            res.send('Inserte una imagen valida');
        };
    };
});

module.exports = router;