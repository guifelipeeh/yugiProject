// models/associations.js

const Card = require('./card');
const CardSet = require('./CardSet');
const CardImage = require('./CardImage');
const CardPrice = require('./CardPrice');

// Card has many CardSets
Card.hasMany(CardSet, {
  foreignKey: 'card_id',
  as: 'card_sets'
});

CardSet.belongsTo(Card, {
  foreignKey: 'card_id',
  as: 'card'
});

// Card has many CardImages
Card.hasMany(CardImage, {
  foreignKey: 'card_id',
  as: 'card_images'
});

CardImage.belongsTo(Card, {
  foreignKey: 'card_id',
  as: 'card'
});

// Card has one CardPrice
Card.hasOne(CardPrice, {
  foreignKey: 'card_id',
  as: 'card_prices'
});

CardPrice.belongsTo(Card, {
  foreignKey: 'card_id',
  as: 'card'
});

module.exports = {
  Card,
  CardSet,
  CardImage,
  CardPrice
};