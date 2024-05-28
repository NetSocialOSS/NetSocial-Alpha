const minifyHTML = require('express-minify-html');
const express = require('express');
const useragent = require('express-useragent');
const app = express();
const path = require('path');
require('dotenv').config()

const port = process.env.PORT;

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/static', express.static('node_modules'));

app.use(useragent.express());

app.use((req, res, next) => {
  const userAgent = req.useragent;
  
  // Check if the user is accessing from a mobile or tablet device
  if (userAgent.isMobile || userAgent.isTablet) {
    res.locals.isMobile = true;
  } else {
    res.locals.isMobile = false;
  }
  
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Specify the correct path to the views directory
app.use(minifyHTML({
  override: true,
  exception_url: false,
  htmlMinifier: {
    removeComments: true,
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    removeAttributeQuotes: true,
    removeEmptyAttributes: true,
    minifyJS: true
  }
}));

app.get('/', (req, res) => {
  res.render(res.locals.isMobile ? 'mobile' : 'index');
});

app.get('*', (req, res) => {
  res.render(res.locals.isMobile ? 'mobile' : 'index');
});

app.use((req, res, next) => {
  res.status(404).render(res.locals.isMobile ? 'mobile' : 'index');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render(res.locals.isMobile ? 'mobile' : 'index');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
