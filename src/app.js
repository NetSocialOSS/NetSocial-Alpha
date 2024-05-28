const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('./models/user');
const Tweet = require('./models/tweet');
const Follow = require('./models/follow');
const Like = require('./models/like');
const Image = require('./models/image');
const BlockedUser = require('./models/blockeduser');
const path = require('path');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage'); // Import GridFsStorage correctly
const Grid = require('gridfs-stream');
const crypto = require('crypto');
const fs = require('fs');
const hCaptcha = require('hcaptcha');
require('dotenv').config()
const Recaptcha = require('express-recaptcha').RecaptchaV2;
const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY);
const app = express();
const jwt = require('jsonwebtoken');
const dns = require('dns');
const { URL } = require('url');
const Reply = require('./models/reply');
const Video = require('./models/video');

// Set up session middleware
app.use(session({
  secret: 'FKTSLSKFT',
  resave: false,
  saveUninitialized: false
}));

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/static', express.static('node_modules'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Specify the correct path to the views directory


// Middleware to authenticate the user
const authenticateUser = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      req.user = user; // Set the user information in the request object
    }
    next();
  } catch (error) {
    console.error('Error occurred during authentication:', error);
    res.send('Error occurred during authentication');
  }
};

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use the authenticateUser middleware for all routes
app.use(authenticateUser);

// Define the fetchTweetsMiddleware function
const fetchTweetsMiddleware = async (req, res, next) => {
  try {
    const tweets = await Tweet.find().populate('user').populate('image');
    res.locals.tweets = tweets;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
};

// Register the fetchTweetsMiddleware globally using app.use
app.use(fetchTweetsMiddleware);



// MongoDB connection settings
const uri = process.env.MONGODB_URI;

// Connect to MongoDB using Mongoose
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');

    // Create GridFS storage engine
    const storage = multer.memoryStorage();


    const upload = multer({ storage });


    function checkLoggedIn(req, res, next) {
      if (req.session.userId) {
        // User is already logged in, redirect to desired page
        res.redirect('/home');
      } else {
        // User is not logged in, proceed to next middleware or route handler
        res.redirect('/login');
      }
    }

    // Routes
    app.get('/', (req, res) => {
      if (req.session.userId) {
        // User is already logged in
        res.redirect('/home');
      } else {
        // Render the login page
        res.render('index');
      }
    });

    app.get('/login', (req, res) => {
      if (req.session.userId) {
        // User is already logged in
        res.redirect('/home');
      } else {
        // Render the login page
        res.render('login', { error: null});
      }
    });

    

    app.post('/login', async (req, res) => {
      try {
        const { identifier, password } = req.body;
    
        // Check if the user is currently locked out
        if (req.session.lockedUntil && req.session.lockedUntil > Date.now()) {
          const remainingTime = Math.ceil((req.session.lockedUntil - Date.now()) / (60 * 1000)); // Remaining time in minutes
          return res.render('login', { error: `You have entered the wrong email or password 5 times. Please wait ${remainingTime} minutes and try again.` });
        }
    
        // Retrieve user information using the User model
        const user = await User.findOne({
          $or: [{ email: identifier }, { username: identifier }]
        });
    
        if (user) {
          // Compare hashed passwords
          const passwordMatch = await bcrypt.compare(password, user.password);
    
          if (passwordMatch) {
            // Set the user session
            req.session.userId = user._id;
    
            // Redirect to the user profile page
            res.redirect('/home');
          } else {
            // Track login attempts
            if (!req.session.loginAttempts) {
              req.session.loginAttempts = 1;
            } else {
              req.session.loginAttempts += 1;
            }
    
            const maxLoginAttempts = 5;
            const remainingAttempts = maxLoginAttempts - req.session.loginAttempts;
    
            if (remainingAttempts > 0) {
              // Display error message with remaining attempts
              res.render('login', { error: `Invalid email or password. You have ${remainingAttempts}/${maxLoginAttempts} attempts left.` });
            } else {
              // Lock the user out for 2 hours
              const lockoutDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
              req.session.lockedUntil = Date.now() + lockoutDuration;
    
              res.render('login', { error: 'You have entered the wrong email or password 5 times. Please wait 2 hours and try again.' });
            }
          }
        } else {
          // Handle user not found
          res.render('login', { error: 'Account not found' });
        }
      } catch (error) {
        // Handle login error
        console.error('Error occurred during login:', error);
        res.render('login', { error: 'Error occurred during login' });
      }
    });
    
    
    

    
    app.get('/register', recaptcha.middleware.render, (req, res) => {
      if (req.session.userId) {
        res.redirect('/home');
      } else {
        res.render('register', { error: null, captcha: res.recaptcha });
      }
    });


    app.post('/register', recaptcha.middleware.verify, async (req, res) => {
      try {
        const { username, email, password } = req.body;
    
        if (!req.recaptcha.error) {
          // reCAPTCHA verification successful
          // Proceed with your registration logic here
    
          // Check if the username already exists
          const existingUser = await User.findOne({ username });
    
          if (existingUser) {
            // Username already exists, display an error message
            return res.render('register', { error: 'Username already exists', captcha: res.recaptcha });
          }
    
          // Check if the email already exists
          const existingEmail = await User.findOne({ email });
    
          if (existingEmail) {
            // Email already exists, display an error message
            return res.render('register', { error: 'Email already exists', captcha: res.recaptcha });
          }
    
          // Check username length
          if (username.length < 3 || username.length > 35) {
            // Username length is invalid, display an error message
            return res.render('register', { error: 'Username must be between 3 and 35 characters long', captcha: res.recaptcha });
          }
    
          // Check password length
          if (password.length < 3 || password.length > 35) {
            // Password length is invalid, display an error message
            return res.render('register', { error: 'Password must be between 3 and 35 characters long', captcha: res.recaptcha });
          }
    
          // Check password strength
          if (password === '123456' || password === username) {
            // Password is weak, display an error message
            return res.render('register', { error: 'Password is too weak', captcha: res.recaptcha });
          }
    
          // Get the last user from the database to determine the idNumber
          const lastUser = await User.findOne().sort({ idNumber: -1 }).limit(1);
          const idNumber = lastUser ? lastUser.idNumber + 1 : 1;
    
          // Create the user using the User model and assign the idNumber
          await User.create({ idNumber, username, email, password });
    
          // Redirect to the home page
          return res.redirect('/home');
        } else {
          // reCAPTCHA verification failed
          return res.render('register', { error: 'Invalid captcha, please try again', captcha: res.recaptcha });
        }
      } catch (error) {
        // Handle registration error
        console.error('Error occurred during registration:', error);
        res.send('Error occurred during registration');
      }
    });
    
    // Render the template for displaying replies
    // Handle the submission of a new reply
app.post('/tweets/:tweetId/replies', async (req, res) => {
  try {
    const { tweetId } = req.params;
    const currentUser = await User.findById(req.session.userId);

    // Find the tweet by ID
    const tweet = await Tweet.findById(tweetId);

    // Create a new reply
    const reply = new Reply({
      content: req.body.content,
      tweet: tweetId,
      user: currentUser._id
    });

    // Save the reply to the database
    await reply.save();

    // Add the reply to the parent reply, if applicable
    if (req.body.parentReplyId) {
      const parentReply = await Reply.findById(req.body.parentReplyId);
      parentReply.replies.push(reply);
      await parentReply.save();
    }

    res.redirect(`/tweets/${tweetId}/replies`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while saving the reply' });
  }
});

// Render the template for viewing replies to a tweet
app.get('/tweets/:tweetId/replies', async (req, res) => {
  try {
    const { tweetId, replyId } = req.params;
    const currentUser = await User.findById(req.session.userId);

    // Find the tweet by ID
    const tweet = await Tweet.findById(tweetId).populate('user', 'displayName bio banner pfp username');
    const reply = await Reply.findById(replyId).populate('user', 'displayName bio banner pfp username');

    // Find all top-level replies that belong to the specified tweet
    const replies = await Reply.find({ tweet: tweetId, parentReply: null }).populate({
      path: 'replies',
      populate: { path: 'user', select: 'displayName' }
    });

    const defaultDisplayName = currentUser.displayName || '';
    const defaultBio = currentUser.bio || '';
    const defaultBanner = currentUser.banner || '';
    const defaultPfp = currentUser.pfp || '';

    res.render('reply', {
      currentPath: `/tweets/${tweetId}/replies`,
      tweet,
      replies,
      tweetId,
      authusername: currentUser.username,
      authpfp: currentUser.pfp,
      authdisplayName: currentUser.displayName,
      successMessage: '',
      errorMessage: '',
      user: {
        displayName: defaultDisplayName,
        bio: defaultBio,
        banner: defaultBanner,
        pfp: defaultPfp
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while retrieving the replies' });
  }
});


app.get('/tweets/:tweetId/replies/new', async (req, res) => {
  try {
    const { tweetId, replyId } = req.params;
    const tweet = await Tweet.findById(tweetId)
    const reply = await Tweet.findById(replyId)
      .populate({ path: 'replies', populate: { path: 'replies' } });
    const currentUser = await User.findById(req.session.userId);

    res.render('new-reply', {
      currentPath: '/tweets/:tweetId/replies/new',
      tweet,

      reply, // Initialize reply as null since it's a new reply
      nestedReplies: tweet.replies, // Pass the nested replies to the template
      authusername: currentUser.username,
      authpfp: currentUser.pfp,
      authdisplayName: currentUser.displayName,
      successMessage: '',
      errorMessage: '',
      user: {
        displayName: currentUser.displayName || '',
        bio: currentUser.bio || '',
        banner: currentUser.banner || '',
        pfp: currentUser.pfp || ''
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while retrieving the reply form' });
  }
});

    
    app.get('/profile', async (req, res) => {
      try {
        if (req.session.userId) {
          // Retrieve user information using the User model
          const user = await User.findById(req.session.userId);
          const currentUser = await User.findById(req.session.userId);
    
          if (user) {
            // Retrieve tweets from the current user and populate the 'user' field
            const tweets = await Tweet.find({ user: user._id }).populate('user');
            const defaultDisplayName = user ? user.displayName : '';
            const defaultBanner = user ? user.banner : '';
            const defaultPfp = user ? user.pfp : '';
    
            res.render('profile', {
              user: {
                displayName: defaultDisplayName,
                banner: defaultBanner,
                pfp: defaultPfp
              },
              username: user.username,
              tweets: tweets,
              authusername: currentUser.username,
              authpfp: currentUser.pfp,
              successMessage: '',
              errorMessage: ''
            });
          } else {
            // Handle user not found
            res.send('User not found');
          }
        } else {
          // Redirect to the login page if user session does not exist
          res.redirect('/');
        }
      } catch (error) {
        // Handle profile error
        console.error('Error occurred while fetching profile:', error);
        res.send('Error occurred while fetching profile');
      }
    });
    


    app.post('/user/settings', upload.fields([
      { name: 'pfp', maxCount: 1 },
      { name: 'banner', maxCount: 1 }
    ]), async (req, res) => {
      try {
        const { displayName, bio } = req.body;
        const userId = req.session.userId;
    
        // Find the user by ID
        const user = await User.getUserById(userId);
    
        if (!user) {
          // User not found
          return res.status(404).send('User not found.');
        }
    
        // Check if profile picture (pfp) was uploaded
        if (req.files['pfp']) {
          const pfpFile = req.files['pfp'][0];
          user.pfp = pfpFile.buffer.toString('base64'); // Convert the buffer to Base64 string
        }
    
        // Check if banner image was uploaded
        if (req.files['banner']) {
          const bannerFile = req.files['banner'][0];
          user.banner = bannerFile.buffer.toString('base64'); // Convert the buffer to Base64 string
        }
    
        // Update the user's display name
        user.displayName = displayName;
    
        // Validate the bio length
        if (bio.length > 160) {
          return res.status(400).send('Bio must be maximum 160 characters.');
        }
        
        // Update the user's bio
        user.bio = bio;
    
        // Save the user changes
        await user.save();
    
        // Return the updated user object
        res.send(user);
      } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating settings.');
      }
    });
    
    
    
    
    
    
    
    
    
    const generateUniqueUsername = async (username) => {
      let uniqueUsername = username;
      let count = 1;
    
      while (await User.findOne({ username: uniqueUsername })) {
        uniqueUsername = `${username}${count}`;
        count++;
      }
    
      return uniqueUsername;
    };
   

// Handle POST request to like a tweet
app.post('/tweets/:tweetId/like', async (req, res) => {
  try {
    const tweetId = req.params.tweetId;
    const userId = req.session.userId;

    // Find the tweet by ID
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
      return res.send('Tweet not found');
    }

    // Check if the user has already liked the tweet
    if (tweet.likes.includes(userId)) {
      // Unlike the tweet by removing the user ID from the likes array
      const index = tweet.likes.indexOf(userId);
      tweet.likes.splice(index, 1);

      // Save the updated tweet
      await tweet.save();

      // Redirect the user back to the original page
      return res.redirect('back');
    } else {
      // Add the user ID to the likes array
      tweet.likes.push(userId);

      // Save the updated tweet
      await tweet.save();

      // Redirect the user back to the original page
      return res.redirect('back');
    }
  } catch (error) {
    console.error('Error occurred while liking/unliking tweet:', error);
    res.send('Error occurred while liking/unliking tweet');
  }
});



// Handle POST request to unlike a tweet
app.post('/tweets/:tweetId/unlike', async (req, res) => {
  try {
    const tweetId = req.params.tweetId;
    const userId = req.session.userId;

    // Find the tweet by ID
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
      return res.send('Tweet not found');
    }

    // Check if the user has liked the tweet
    if (!tweet.likes.includes(userId)) {
      return res.send('You have not liked this tweet');
    }

    // Remove the user ID from the likes array
    tweet.likes.pull(userId);

    // Save the updated tweet
    await tweet.save();

    res.redirect('/home');
  } catch (error) {
    console.error('Error occurred while unliking tweet:', error);
    res.send('Error occurred while unliking tweet');
  }
});

// Handle GET request for the home page
app.get('/home', async (req, res) => {
  try {
    if (req.session.userId) {
      const currentUser = await User.findById(req.session.userId);

      if (currentUser) {
      const authuserId = req.session.userId;
        
        // Calculate the date two days ago
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // Find tweets by users the current user is following, including the current user itself
        const tweets = await Tweet.find({
          $or: [
            { user: authuserId },
          ],
          timestamp: { $gt: twoDaysAgo } // Filter out tweets older than two days
        })
          .populate('user')
          .populate('image')
          .sort({ timestamp: -1 }); // Sort tweets by timestamp in descending order (from new to old)

        // Get the IDs of tweets liked by the authenticated user
        const likedTweets = await Tweet.find({
          _id: { $in: currentUser.likes }
        }).select('_id');

        const defaultDisplayName = currentUser.displayName || '';
        const defaultBio = currentUser.bio || '';
        const defaultBanner = currentUser.banner || '';
        const defaultPfp = currentUser.pfp || '';

        res.render('home', {
          user: {
            displayName: defaultDisplayName,
            bio: defaultBio,
            banner: defaultBanner,
            pfp: defaultPfp
          },
          tweetData: {},
          username: req.username,
          tweets,
          authuserId,
          likedTweets,
          authusername: currentUser.username,
          authdisplayName: currentUser.displayName,
          authpfp: currentUser.pfp,
          successMessage: '',
          errorMessage: '',
          currentPath: '/home'
        });
      } else {
        res.send('User not found');
      }
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Error occurred while fetching profile:', error);
    res.status(500).send('Error occurred while fetching profile');
  }
});



app.post('/follow/:userIdToFollow', async (req, res) => {
  const { userId } = req.body;
  const { userIdToFollow } = req.params;

  try {
    const user = await User.getUserById(userId);
    const userToFollow = await User.getUserById(userIdToFollow);

    if (!user || !userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.follow(userIdToFollow);

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for unfollowing a user
app.post('/unfollow/:userIdToUnfollow', async (req, res) => {
  const { userId } = req.body;
  const { userIdToUnfollow } = req.params;

  try {
    const user = await User.getUserById(userId);
    const userToUnfollow = await User.getUserById(userIdToUnfollow);

    if (!user || !userToUnfollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user is already following the user to unfollow
    if (!user.following.includes(userIdToUnfollow)) {
      return res.status(400).json({ message: 'User is not being followed' });
    }

    // Remove the userIdToUnfollow from the following array
    user.following.pull(userIdToUnfollow);
    await user.save();

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
    
    app.post('/block/:username', async (req, res) => {
      try {
        if (req.session.userId) {
          const currentUser = await User.findById(req.session.userId);
          const userToBlock = await User.findOne({ username: req.params.username });

          if (currentUser && userToBlock) {
            // Check if the user is trying to block themselves
            if (currentUser.username === userToBlock.username) {
              return res.send("You cannot block yourself");
            }

            // Create a new BlockedUser instance
            const blockedUser = new BlockedUser({
              blockingUser: currentUser._id,
              blockedUser: userToBlock._id
            });

            // Save the blockedUser instance
            await blockedUser.save();

            // Redirect back to the profile page of the user being blocked
            res.redirect(`/user/${userToBlock.username}`);
          } else {
            // Handle user not found
            res.send('User not found');
          }
        } else {
          // Redirect to the login page if user session does not exist
          res.redirect('/login');
        }
      } catch (error) {
        // Handle block error
        console.error('Error occurred while blocking:', error);
        res.send('Error occurred while blocking');
      }
    });
    

    
    // Generate a random number as the filename
const generateRandomFilename = () => {
  const randomNumber = Math.floor(Math.random() * 1000000000) + 1; // Generate a random number between 1 and 1000000000
  return `${randomNumber}.jpg`; // Append the desired file extension, e.g., .jpg
};

// Upload an image and create a tweet
app.post('/tweet', upload.fields([{ name: 'image' }, { name: 'video' }]), async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;

    let tweetData = {
      content,
      user: userId
    };

    if (req.files) {
      const { image, video } = req.files;

      if (image) {
        const { filename, originalname, buffer } = image[0];

        const imageObj = new Image({
          filename,
          originalname,
          data: buffer.toString('base64')
        });

        await imageObj.save();
        tweetData.image = imageObj._id;
      }

      if (video) {
        const { filename, mimetype } = video[0];

        const videoObj = new Video({
          filename,
          contentType: mimetype
        });

        await videoObj.save();
        tweetData.video = videoObj._id;
      }
    }

    // Check if the content contains a valid URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);

    if (urls) {
      // Iterate over each URL found in the content
      for (const url of urls) {
        try {
          const { hostname } = new URL(url);

          // Perform a DNS lookup to validate the domain
          await dns.promises.lookup(hostname);

          // Add the valid URL to the tweetData object
          tweetData.url = url;
        } catch (error) {
          console.error(`Invalid domain: ${url}`);
        }
      }
    }

    const tweet = new Tweet(tweetData);
    const savedTweet = await tweet.save();

    req.session.savedTweet = savedTweet;
    return res.redirect('back');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating a post' });
  }
});





app.get('/p/:username', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    const username = req.params.username;
    const currentUser = await User.findById(req.session.userId);
    let user;

    user = await User.findOne({ username });

    if (!user) {
      const authuserId = req.session.userId;
      const defaultDisplayName = currentUser.displayName || '';
      const defaultBio = currentUser.bio || '';
      const defaultBanner = currentUser.banner || '';
      const defaultPfp = currentUser.pfp || '';

      return res.status(404).render('errors/user/404', {
        user: {
          displayName: defaultDisplayName,
          bio: defaultBio,
          banner: defaultBanner,
          pfp: defaultPfp
        },
        authuserId,
        authusername: currentUser.username,
        authdisplayName: currentUser.displayName,
        authpfp: currentUser.pfp,
        successMessage: '',
        errorMessage: '',
        currentPath: '/p/404'
      });
    }

    const tweets = await Tweet.find({ user: user._id }).populate('user image');
    const likedTweets = await Tweet.find({ _id: { $in: currentUser.likes } }).populate('user image');

    const likedTweetIds = likedTweets.map(tweet => tweet._id.toString());
    const userLikedTweets = tweets.filter(tweet => likedTweetIds.includes(tweet._id.toString()));

    res.render('user', {
      currentUser,
      user,
      likedTweets: userLikedTweets,
      tweets,
      username: user.username,
      authusername: currentUser.username,
      authpfp: currentUser.pfp,
      successMessage: '',
      errorMessage: '',
      currentPath: `/p/${username}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});



// Retrieve and send the image data
app.get('/images/:filename', async (req, res) => {
  try {
    const image = await Image.findOne({ filename: req.params.filename });

    if (!image) {
      return res.status(404).send('File not found');
    }

    // Send the image data as a response
    res.send(Buffer.from(image.data, 'base64'));
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

    

app.post('/post/delete/:tweetId', async (req, res) => {
  try {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);

      if (user) {
        const tweetId = req.params.tweetId;

        // Find the tweet by ID
        const tweet = await Tweet.findById(tweetId);

        if (tweet) {
          // Check if the tweet belongs to the current user
          if (tweet.user.toString() === user._id.toString()) {
            // Delete the tweet
            await Tweet.deleteOne({ _id: tweetId });

            // Redirect back to the profile page
            return res.redirect('back');
          } else {
            // Tweet does not belong to the current user
            res.send('You do not have permission to delete this post');
          }
        } else {
          // Tweet not found
          res.send('Post not found');
        }
      } else {
        // Handle user not found
        res.send('User not found');
      }
    } else {
      // Redirect to the login page if the user session does not exist
      res.redirect('/login');
    }
  } catch (error) {
    // Handle error
    console.error('Error occurred while deleting a tweet:', error);
    res.send('Error occurred while deleting a post');
  }
});

app.post('/search', async (req, res) => {
  try {
    const query = req.body.query;

    // Perform the search query to fetch the users
    const users = await User.find({ username: { $regex: `^${query}`, $options: 'i' } });

    res.json(users);
  } catch (error) {
    console.error('Error occurred during search:', error);
    res.status(500).json({ error: 'Error occurred during search' });
  }
});



    app.get('/logout', (req, res) => {
      req.session.destroy();
      res.redirect('/login');
    });


   // errors
   
   app.get('*', async (req, res) => {
    try {
      if (req.session.userId) {
        const currentUser = await User.findById(req.session.userId);
        
        if (currentUser) {
        const authuserId = req.session.userId;
          
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

          const defaultDisplayName = currentUser.displayName || '';
          const defaultBio = currentUser.bio || '';
          const defaultBanner = currentUser.banner || '';
          const defaultPfp = currentUser.pfp || '';
  
          res.render('errors/404', {
            user: {
              displayName: defaultDisplayName,
              bio: defaultBio,
              banner: defaultBanner,
              pfp: defaultPfp
            },
            authuserId,
            authusername: currentUser.username,
            authdisplayName: currentUser.displayName,
            authpfp: currentUser.pfp,
            successMessage: '',
            errorMessage: '',
            currentPath: '/404'
          });
        } else {
          res.send('User not found');
        }
      } else {
        res.redirect('/login');
      }
    } catch (error) {
      console.error('Error occurred while fetching profile:', error);
      res.status(500).send('Error occurred while fetching profile');
    }
  });

  app.use(async (err, req, res, next) => {
    try {
      if (req.session.userId) {
        const currentUser = await User.findById(req.session.userId);
  
        if (currentUser) {
          const authuserId = req.session.userId;
  
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
          const defaultDisplayName = currentUser.displayName || '';
          const defaultBio = currentUser.bio || '';
          const defaultBanner = currentUser.banner || '';
          const defaultPfp = currentUser.pfp || '';
  
          console.error('Internal Server Error:', err);
          res.status(500).render('errors/500', {
            user: {
              displayName: defaultDisplayName,
              bio: defaultBio,
              banner: defaultBanner,
              pfp: defaultPfp,
            },
            authuserId,
            authusername: currentUser.username,
            authdisplayName: currentUser.displayName,
            authpfp: currentUser.pfp,
            successMessage: '',
            errorMessage: '',
            currentPath: '/500',
          });
        } else {
          res.send('Internal Server Error');
        }
      } else {
        res.redirect('/login');
      }
    } catch (error) {
      console.error('Error occurred while fetching profile:', error);
      res.status(500).send('Error occurred while fetching profile');
    }
  });
  
  app.use(async (err, req, res, next) => {
    try {
      if (req.session.userId) {
        const currentUser = await User.findById(req.session.userId);
  
        if (currentUser) {
          const authuserId = req.session.userId;
  
          const defaultDisplayName = currentUser.displayName || '';
          const defaultBio = currentUser.bio || '';
          const defaultBanner = currentUser.banner || '';
          const defaultPfp = currentUser.pfp || '';
  
          res.status(401).render('errors/401', {
            user: {
              displayName: defaultDisplayName,
              bio: defaultBio,
              banner: defaultBanner,
              pfp: defaultPfp,
            },
            authuserId,
            authusername: currentUser.username,
            authdisplayName: currentUser.displayName,
            authpfp: currentUser.pfp,
            successMessage: '',
            errorMessage: '',
            currentPath: '/401',
          });
        } else {
          res.send('Unauthorized');
        }
      } else {
        res.redirect('/login');
      }
    } catch (error) {
      console.error('Error occurred while fetching profile:', error);
      res.status(500).send('Error occurred while fetching profile');
    }
  });
  
  app.use(async (err, req, res, next) => {
    try {
      if (req.session.userId) {
        const currentUser = await User.findById(req.session.userId);
  
        if (currentUser) {
          const authuserId = req.session.userId;
  
          const defaultDisplayName = currentUser.displayName || '';
          const defaultBio = currentUser.bio || '';
          const defaultBanner = currentUser.banner || '';
          const defaultPfp = currentUser.pfp || '';
  
          res.status(403).render('errors/403', {
            user: {
              displayName: defaultDisplayName,
              bio: defaultBio,
              banner: defaultBanner,
              pfp: defaultPfp,
            },
            authuserId,
            authusername: currentUser.username,
            authdisplayName: currentUser.displayName,
            authpfp: currentUser.pfp,
            successMessage: '',
            errorMessage: '',
            currentPath: '/403',
          });
        } else {
          res.send('403 Forbidden');
        }
      } else {
        res.redirect('/login');
      }
    } catch (error) {
      console.error('Error occurred while fetching profile:', error);
      res.status(500).send('Error occurred while fetching profile');
    }
  });
  
  app.use(async (err, req, res, next) => {
    try {
      if (req.session.userId) {
        const currentUser = await User.findById(req.session.userId);
  
        if (currentUser) {
          const authuserId = req.session.userId;
  
          const defaultDisplayName = currentUser.displayName || '';
          const defaultBio = currentUser.bio || '';
          const defaultBanner = currentUser.banner || '';
          const defaultPfp = currentUser.pfp || '';
  
          res.status(400).render('errors/400', {
            user: {
              displayName: defaultDisplayName,
              bio: defaultBio,
              banner: defaultBanner,
              pfp: defaultPfp,
            },
            authuserId,
            authusername: currentUser.username,
            authdisplayName: currentUser.displayName,
            authpfp: currentUser.pfp,
            successMessage: '',
            errorMessage: '',
            currentPath: '/400',
          });
        } else {
          res.send('Bad Request');
        }
      } else {
        res.redirect('/login');
      }
    } catch (error) {
      console.error('Error occurred while fetching profile:', error);
      res.status(500).send('Error occurred while fetching profile');
    }
  });
  

    // Start the server
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });
