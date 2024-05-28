const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: { type: String, required: true },
  displayName: { type: String },
  bio: { type: String },
  banner: { type: String }, // Store the banner image as Base64 string
  pfp: { type: String }, // Store the profile picture as Base64 string
  following: [{ type: String, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dateJoined: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(this.password, salt);
      this.password = hashedPassword;
    }
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.statics.createUser = async function (username, email, password, bannerFile, pfpFile) {
  try {
    const user = new this({ username, email, password });

    // Save the banner image
    if (bannerFile) {
      user.banner = bannerFile.buffer.toString('base64'); // Convert the buffer to Base64 string
    }

    // Save the profile picture (pfp)
    if (pfpFile) {
      user.pfp = pfpFile.buffer.toString('base64'); // Convert the buffer to Base64 string
    }

    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

userSchema.statics.getUserByUsername = async function (username) {
  try {
    return this.findOne({ username: `@${username}` });
  } catch (error) {
    throw error;
  }
};

userSchema.statics.getUserByEmail = async function (email) {
  try {
    return this.findOne({ email });
  } catch (error) {
    throw error;
  }
};

userSchema.statics.getUserById = async function (userId) {
  try {
    return this.findOne({ _id: userId });
  } catch (error) {
    throw error;
  }
};

userSchema.methods.follow = async function (userIdToFollow) {
  try {
    if (!this.following.includes(userIdToFollow)) {
      this.following.push(userIdToFollow);
      await this.save();
    }
  } catch (error) {
    throw error;
  }
};

userSchema.methods.unfollow = async function (userIdToUnfollow) {
  try {
    const index = this.following.indexOf(userIdToUnfollow);
    if (index > -1) {
      this.following.splice(index, 1);
      await this.save();
    }
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
