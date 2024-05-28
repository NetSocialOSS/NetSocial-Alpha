const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema({
  blockingUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blockedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);

module.exports = BlockedUser;
