const mongoose = require('mongoose');
const User = require('./user'); // Import the User model

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tweet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
    required: true
  }
});

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;
