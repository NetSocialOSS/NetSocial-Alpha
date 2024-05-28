const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: false // Make the filename field optional
  },
  originalname: {
    type: String,
    required: true
  },
  data: {
    type: String,
    required: true
  }
});

imageSchema.pre('save', function (next) {
  if (!this.filename) {
    // Generate a random number as the filename if not provided
    const randomNumber = Math.floor(Math.random() * 1234567899) + 1;
    this.filename = randomNumber.toString();
  }

  // Check if the filename does not end with .png
  if (!this.filename.endsWith('.png')) {
    // Append .png to the filename
    this.filename = this.filename + '.png';
  }

  next();
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
