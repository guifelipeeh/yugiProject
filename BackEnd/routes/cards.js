const router = require('express').Router();
const cardController = require('../controller/cardController');

router.get('/niveis')
router.get('/tipos')
router.get('/atributos')
router.get('/atk')
router.get('/def')
router.get('/name/:name', cardController.getCardsByName);


module.exports = router;