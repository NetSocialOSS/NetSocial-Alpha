const mongoose = require('mongoose');
const User = require('./user'); // Import the User model
const Reply = require('./reply'); // Import the Reply model

const tweetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: false
  },
  image: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reply'
  }]
});

const Tweet = mongoose.models.Tweet || mongoose.model('Tweet', tweetSchema);

module.exports = Tweet;
