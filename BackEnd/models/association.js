// models/association.js
const sequelize = require('../db/config');
const Card = require('./Card');
const CardSet = require('./cardset');
const CardImage = require('./cardimage');
const CardPrice = require('./cardprice');

// Definir associações
Card.hasMany(CardSet, {
  foreignKey: 'card_id',
  as: 'card_sets'
});

CardSet.belongsTo(Card, {
  foreignKey: 'card_id',
  as: 'card'
});

Card.hasMany(CardImage, {
  foreignKey: 'card_id',
  as: 'card_images'
});

CardImage.belongsTo(Card, {
  foreignKey: 'card_id',
  as: 'card'
});

Card.hasOne(CardPrice, {
  foreignKey: 'card_id',
  as: 'card_prices'
});

CardPrice.belongsTo(Card, {
  foreignKey: 'card_id',
  as: 'card'
});

module.exports = {
  sequelize,
  Card,
  CardSet,
  CardImage,
  CardPrice
};