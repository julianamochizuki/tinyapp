const express = require("express");
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const bcrypt = require("bcryptjs");
const app = express();
const PORT = 8080;
const { getUserByEmail, generateRandomString, urlsForUser } = require('./helpers.js');

const urlDatabase = {};
const users = {};
let visitsInCurrentSession = {};

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));
app.use(methodOverride('_method'));


app.get("/", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.redirect('/login');
  }
  res.redirect('/urls');
});

// User registration page
app.get("/register", (req, res) => {
  const userId = req.session.user_id;
  if (users[userId]) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[userId],
  };
  res.render("register", templateVars);
});

// Submits new user registration
app.post("/register", (req, res) => {
  const userEmail = req.body["email"];
  const userPassword = req.body["password"];
  const hashedPassword = bcrypt.hashSync(userPassword, 10);
  const userInTheDatabase = getUserByEmail(userEmail, users);
  if (!userEmail || !userPassword) {
    return res.status(400).send("<h2>Please enter a username and a password.</h2>");
  }
  if (userInTheDatabase) {
    return res.status(400).send("<h2>The username already exists.<h2>");
  } else {
    const userRandomID = generateRandomString();
    users[userRandomID] = {
      id: userRandomID,
      email: userEmail,
      password: hashedPassword
    };
    req.session["user_id"] = `${userRandomID}`;
    res.redirect(`/urls`);
  }
});

// Login page
app.get("/login", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[userId],
  };
  res.render("login", templateVars);
});

// Submits login info and sets the cookie
app.post("/login", (req, res) => {
  const userEmail = req.body["email"];
  const userPassword = req.body["password"];
  const userInTheDatabase = getUserByEmail(userEmail, users);
  if (!userInTheDatabase) {
    return res.status(403).send("<h2>There is no account associated with this email address.<h2>");
  }
  if (bcrypt.compareSync(userPassword, userInTheDatabase.password)) {
    req.session["user_id"] = `${userInTheDatabase.id}`;
    res.redirect(`/urls`);
  } else {
    return res.status(403).send("<h2>Username and password do not match.<h2>");
  }
});

// Displays the user's database
app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.status(401).send("<h2>Please login or register first to access this page.</h2>");
  }
  const templateVars = {
    user: users[userId],
    urls: urlsForUser(userId, urlDatabase)
  };
  res.render("urls_index", templateVars);
});

// Page to create new tinyURL
app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.redirect('/login');
  }
  const templateVars = {
    user: users[userId]
  };
  res.render("urls_new", templateVars);
});

// Submits new URL
app.post("/urls", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.status(401).send("<h2>Please login or register first to create a new shortURL</h2>");
  }
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body["longURL"],
    userId: userId,
    dateCreated: new Date().toLocaleDateString(),
    accessCount: 0,
    uniqueVisits: 0
  };
  res.redirect(`/urls/${shortURL}`);
});

// Displays generated tinyURL
app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    return res.status(401).send("<h2>Please login or register first to access this page.</h2>");
  }
  if (shortUrl in userDatabase) {
    const templateVars = {
      user: users[userId],
      id: shortUrl,
      longURL: urlDatabase,
      urls: userDatabase
    };
    res.render("urls_show", templateVars);
  } else {
    return res.status(404).send("<h2>Page not found.\n</h2><h3>The requested URL page was not found.</h3>");
  }
});

// Accesses longURL page through tinyURL
app.get("/u/:id", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    return res.status(401).send("<h2>Please login or register first to access this page.</h2>");
  }
  if (shortUrl in userDatabase) {
    // Count total number of visits
    urlDatabase[shortUrl].accessCount++;
    // Count unique visits (1 visit per session per shortURL)
    if (!(userId in visitsInCurrentSession)) {
      visitsInCurrentSession[userId] = [shortUrl];
      urlDatabase[shortUrl].uniqueVisits += 1;
    }
    if (!visitsInCurrentSession[userId].includes(shortUrl)) {
      urlDatabase[shortUrl].uniqueVisits += 1;
      visitsInCurrentSession[userId].push(shortUrl);
    }
    const longURL = urlDatabase[shortUrl]["longURL"];
    res.redirect(longURL);
  } else {
    return res.status(404).send("<h2>Page not found.\n</h2><h3>The requested URL page was not found.</h3>");
  }
});

// Deletes URL
app.delete("/urls/:id/delete", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    return res.status(401).send("<h3>Please login or register first.</h3><h2>You do not have authorization to delete this URL</h2>");
  }
  if (shortUrl in userDatabase) {
    delete urlDatabase[shortUrl];
    res.redirect(`/urls`);
  } else {
    return res.status(404).send("<h2>ShortURL does not exist.</h2>");
  }
});

// Redirects to the edit page
app.post("/urls/:id/edit", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    return res.status(401).send("<h3>Please login or register first.</h3><h2>You do not have authorization to edit this URL</h2>");
  }
  if (shortUrl in userDatabase) {
    res.redirect(`/urls/${shortUrl}`);
  } else {
    return res.status(404).send("<h2>The shortURL does not correspond with a long URL</h2>");
  }
});

// Updates URL
app.put("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    return res.status(401).send("<h2>Please login or register first to access this page.</h2>");
  }
  if (shortUrl in userDatabase) {
    urlDatabase[shortUrl]["longURL"] = req.body["longURL"],
    res.redirect(`/urls`);
  } else {
    return res.status(404).send("<h2>The shortURL does not correspond with a long URL</h2>");
  }
  // console.log("userDatabase", userDatabase, "urlDatabase", urlDatabase)
});

// Logout and clear the cookie
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/login`);
  visitsInCurrentSession = {};
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});