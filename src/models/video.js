const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
