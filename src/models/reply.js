const mongoose = require('mongoose');
const User = require('./user'); // Import the User model
const Tweet = require('./tweet'); // Import the Tweet model

const replySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tweet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
    required: true
  },
  parentReply: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reply'
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reply'
  }]
});

const Reply = mongoose.models.Reply || mongoose.model('Reply', replySchema);

module.exports = Reply;
