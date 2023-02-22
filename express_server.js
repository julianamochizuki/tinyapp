const express = require("express");
const app = express();
const PORT = 8080;
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

const generateRandomString = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = "";
  for (let i = 0; i < 6; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
};

const getUserByEmail = email => {
  for (const key in users) {
    if (users[key]["email"] === email) {
      return users[key];
    }
  }
  return null;
};

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// Passes the URL data to the template
app.get("/urls", (req, res) => {
  let userId = req.cookies["user_id"];
  const templateVars = {
    // username: req.cookies["username"],
    user: users[userId],
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

// Page to create new tinyURL
app.get("/urls/new", (req, res) => {
  let userId = req.cookies["user_id"];
  const templateVars = {
    user: users[userId]
  };
  res.render("urls_new", templateVars);
});

// Submits new URL
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body["longURL"];
  res.redirect(`/urls/${shortURL}`);
});

// Shows generated tinyURL
app.get("/urls/:id", (req, res) => {
  let userId = req.cookies["user_id"];
  const templateVars = {
    user: users[userId],
    id: req.params.id,
    longURL: urlDatabase
  };
  res.render("urls_show", templateVars);
});

// Accesses URL page through tinyURL
app.get("/u/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  if (!(req.params.id in urlDatabase)) {
    res.status(404).send("<html><body><h2>Page not found.\n</h2><h3>The requested URL page was not found on this server.</h3></body></html>\n");
  }
  res.redirect(longURL);
});

// Deletes URLs
app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect(`/urls`);
});

// Redirects to the page to update URL
app.post("/urls/:id/edit", (req, res) => {
  res.redirect(`/urls/${req.params.id}`);
});

// Updates URLs
app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body["longURL"];
  res.redirect(`/urls`);
});

// Submits login info and sets the cookie
app.post("/login", (req, res) => {
  const userEmail = req.body["email"];
  const userPassword = req.body["password"];
  const userInTheDatabase = getUserByEmail(userEmail);
  if (!userInTheDatabase) {
    return res.sendStatus(403);
  }
  if (userPassword !== userInTheDatabase.password) {
    return res.sendStatus(403);
  }
  res.cookie(`user_id`, `${userInTheDatabase.id}`);
  res.redirect(`/urls`);
});

// Logout and clear the cookie
app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect(`/login`);
});

// Register page
app.get("/register", (req, res) => {
  let userId = req.cookies["user_id"];
  if (users[userId]) {
    res.redirect('/urls');
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
  if (!userEmail || !userPassword || getUserByEmail(userEmail)) {
    return res.sendStatus(400);
  } else {
    const userRandomID = generateRandomString();
    users[userRandomID] = {
      id: userRandomID,
      email: userEmail,
      password: userPassword
    };
    res.cookie(`user_id`, `${userRandomID}`);
    res.redirect(`/urls`);
  }
  // console.log(users);
});

// Login page
app.get("/login", (req, res) => {
  const userId = req.cookies["user_id"];
  if (userId) {
    res.redirect('/urls');
  }
  const templateVars = {
    user: users[userId],
  };
  res.render("login", templateVars);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});