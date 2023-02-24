const express = require("express");
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const app = express();
const PORT = 8080;
const { getUserByEmail, generateRandomString, urlsForUser } = require('./helpers.js');

const urlDatabase = {};
const users = {};
let visitInCurrentSession = {};

app.set("view engine", "ejs");

app.use(morgan('dev'));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.redirect('/login');
  }
  res.redirect('/urls');
});

// Displays the URL data to the template
app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
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
    return res.send("<html><body><h2>Please login to create new shortURL\n</h2>/body></html>");
  }
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body["longURL"],
    userId: userId,
    dateCreated: new Date().toLocaleDateString(),
    // Total number of visits
    accessCount: 0,
    // Number of unique visits per session
    uniqueVisits: 0
  };
  res.redirect(`/urls/${shortURL}`);
  console.log(urlDatabase);
});

// Shows generated tinyURL
app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(req.params.id in urlsForUser(userId, urlDatabase))) {
    return res.status(404).send("<html><body><h2>Page not found.\n</h2><h3>The requested URL page was not found on this server.</h3></body></html>\n");
  }
  const templateVars = {
    user: users[userId],
    id: req.params.id,
    longURL: urlDatabase
  };
  res.render("urls_show", templateVars);
});

// Accesses URL page through tinyURL
app.get("/u/:id", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(shortUrl in urlsForUser(userId, urlDatabase))) {
    return res.status(404).send("<html><body><h2>Page not found.\n</h2><h3>The requested URL page was not found on this server.</h3></body></html>\n");
  } else {
    urlDatabase[shortUrl].accessCount++;
    const longURL = urlDatabase[shortUrl]["longURL"];
    if (!(userId in visitInCurrentSession)) {
      visitInCurrentSession[userId] = [shortUrl];
      urlDatabase[req.params.id].uniqueVisits += 1;
    }
    if (!visitInCurrentSession[userId].includes(shortUrl)) {
      urlDatabase[req.params.id].uniqueVisits += 1;
      visitInCurrentSession[userId].push(shortUrl);
    }
    res.redirect(longURL);
    
  }console.log(visitInCurrentSession);
});

// Deletes URLs
app.post("/urls/:id/delete", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(req.params.id in urlsForUser(userId, urlDatabase))) {
    return res.status(404).send("<html><body><h2>ShortURL does not exist.\n</h2></body></html>\n");
  }
  delete urlDatabase[req.params.id];
  res.redirect(`/urls`);
});

// Redirects to the page to update URL
app.post("/urls/:id/edit", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(req.params.id in urlsForUser(userId, urlDatabase))) {
    return res.status(404).send("<html><body><h2>ShortURL does not exist.\n</h2></body></html>\n");
  }
  res.redirect(`/urls/${req.params.id}`);
});

// Updates URLs
app.post("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(req.params.id in urlsForUser(userId, urlDatabase))) {
    return res.status(404).send("<html><body><h2>ShortURL does not exist.\n</h2></body></html>\n");
  }
  urlDatabase[req.params.id]["longURL"] = req.body["longURL"],
  res.redirect(`/urls`);
});

// Submits login info and sets the cookie
app.post("/login", (req, res) => {
  const userEmail = req.body["email"];
  const userPassword = req.body["password"];
  const userInTheDatabase = getUserByEmail(userEmail, users);
  if (!userInTheDatabase) {
    return res.sendStatus(403);
  }
  if (bcrypt.compareSync(userPassword, userInTheDatabase.password)) {
    req.session["user_id"] = `${userInTheDatabase.id}`;
    res.redirect(`/urls`);
  } else {
    return res.sendStatus(403);
  }
});

// Logout and clear the cookie
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/login`);
  visitInCurrentSession = {};
});

// Register page
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
  if (!userEmail || !userPassword || getUserByEmail(userEmail, users)) {
    return res.sendStatus(400);
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
  console.log(users);
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

// Logout and clear the cookie
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/urls`);
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
