const express = require("express");
const morgan = require("morgan");
const cookieSession = require("cookie-session");
const methodOverride = require("method-override");
const bcrypt = require("bcryptjs");
const app = express();
const PORT = process.env.PORT || 8080;
const {
  getUserByEmail,
  generateRandomString,
  urlsForUser,
} = require("./helpers.js");

const urlDatabase = {};
const users = {};

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(
  cookieSession({
    name: "session",
    keys: ["key1", "key2"],
  })
);
app.use(methodOverride("_method"));

app.get("/", (req, res) => {
  const userId = req.session.user_id;

  const templateVars = {
    user: users[userId],
  };
  res.render("index", templateVars);
});

// User registration page
app.get("/register", (req, res) => {
  const userId = req.session.user_id;
  if (users[userId]) {
    return res.redirect("/urls");
  }
  const templateVars = {
    user: users[userId],
  };
  res.render("register", templateVars);
});

// Submits new user registration
app.post("/register", (req, res) => {
  const userId = req.session.user_id;
  const userEmail = req.body["email"];
  const userPassword = req.body["password"];
  const hashedPassword = bcrypt.hashSync(userPassword, 10);
  const userInTheDatabase = getUserByEmail(userEmail, users);
  if (!userEmail || !userPassword) {
    const templateVars = {
      user: users[userId],
      status: 400,
      message: "Please enter a username and a password.",
    };
    res.render("error", templateVars);
  } else {
    if (userInTheDatabase) {
      const templateVars = {
        user: users[userId],
        status: 409,
        message: "The username already exists.",
      };
      res.render("error", templateVars);
    } else {
      const userRandomID = generateRandomString();
      users[userRandomID] = {
        id: userRandomID,
        email: userEmail,
        password: hashedPassword,
      };
      req.session["user_id"] = `${userRandomID}`;
      res.redirect(`/urls`);
    }
  }
});

// Login page
app.get("/login", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    return res.redirect("/urls");
  }
  const templateVars = {
    user: users[userId],
  };
  res.render("login", templateVars);
});

// Submits login info and sets the cookie
app.post("/login", (req, res) => {
  const userId = req.session.user_id;
  const userEmail = req.body["email"];
  const userPassword = req.body["password"];
  const userInTheDatabase = getUserByEmail(userEmail, users);

  if (!userInTheDatabase) {
    const templateVars = {
      user: users[userId],
      status: 404,
      message: "There is no account associated with this email address.",
    };
    res.render("error", templateVars);
  } else {
    if (bcrypt.compareSync(userPassword, userInTheDatabase.password)) {
      req.session["user_id"] = `${userInTheDatabase.id}`;
      res.redirect(`/urls`);
    } else {
      const templateVars = {
        user: users[userId],
        status: 401,
        message: "Username and password do not match.",
      };
      res.render("error", templateVars);
    }
  }
});

// Displays the user's database
app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.redirect("/login");
  }
  const templateVars = {
    user: users[userId],
    urls: urlsForUser(userId, urlDatabase),
  };
  res.render("urls_index", templateVars);
});

// Page to create new tinyURL
app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.redirect("/login");
  }
  const templateVars = {
    user: users[userId],
  };
  res.render("urls_new", templateVars);
});

// Submits new URL
app.post("/urls", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    const templateVars = {
      user: users[userId],
      status: 401,
      message: "Please login or register first to create a new shortURL.",
    };
    res.render("error", templateVars);
  }
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body["longURL"],
    userId: userId,
    dateCreated: new Date().toLocaleDateString(),
    accessCount: 0,
    uniqueVisits: 0,
    uniqueVisitors: [],
  };
  res.redirect(`/urls/${shortURL}`);
});

// Displays generated tinyURL
app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    const templateVars = {
      user: users[userId],
      status: 401,
      message: "Please login or register first to access this page.",
    };
    res.render("error", templateVars);
  }
  if (shortUrl in userDatabase) {
    const templateVars = {
      user: users[userId],
      id: shortUrl,
      longURL: urlDatabase,
      urls: userDatabase,
    };
    res.render("urls_show", templateVars);
  } else {
    const templateVars = {
      user: users[userId],
      status: 404,
      message: "Page not found. The requested URL page was not found.",
    };
    res.render("error", templateVars);
  }
});

// Accesses longURL page through tinyURL
app.get("/u/:id", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;

  if (urlDatabase[shortUrl]) {
    urlDatabase[shortUrl].accessCount++;

    if (!urlDatabase[shortUrl].uniqueVisitors.includes(userId)) {
      urlDatabase[shortUrl].uniqueVisitors.push(userId);
      urlDatabase[shortUrl].uniqueVisits += 1;
    }

    const longURL = urlDatabase[shortUrl]["longURL"];
    res.redirect(longURL);
  } else {
    const templateVars = {
      user: users[userId],
      status: 404,
      message: "Page not found. The requested URL page was not found.",
    };
    res.render("error", templateVars);
  }
});

// Deletes URL
app.delete("/urls/:id/delete", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    const templateVars = {
      user: users[userId],
      status: 401,
      message:
        "Please login or register first. You do not have authorization to delete this URL.",
    };
    res.render("error", templateVars);
  }
  if (shortUrl in userDatabase) {
    delete urlDatabase[shortUrl];
    res.redirect(`/urls`);
  } else {
    const templateVars = {
      user: users[userId],
      status: 404,
      message: "ShortURL does not exist.",
    };
    res.render("error", templateVars);
  }
});

// Redirects to the edit page
app.post("/urls/:id/edit", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    const templateVars = {
      user: users[userId],
      status: 401,
      message:
        "Please login or register first. You do not have authorization to edit this URL.",
    };
    res.render("error", templateVars);
  }
  if (shortUrl in userDatabase) {
    res.redirect(`/urls/${shortUrl}`);
  } else {
    const templateVars = {
      user: users[userId],
      status: 404,
      message: "The shortURL does not correspond with a long URL.",
    };
    res.render("error", templateVars);
  }
});

// Updates URL
app.put("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const shortUrl = req.params.id;
  const userDatabase = urlsForUser(userId, urlDatabase);
  if (!userId) {
    const templateVars = {
      user: users[userId],
      status: 401,
      message: "Please login or register first to access this page.",
    };
    res.render("error", templateVars);
  }
  if (shortUrl in userDatabase) {
    (urlDatabase[shortUrl]["longURL"] = req.body["longURL"]),
      res.redirect(`/urls`);
  } else {
    const templateVars = {
      user: users[userId],
      status: 404,
      message: "The shortURL does not correspond with a long URL.",
    };
    res.render("error", templateVars);
  }
});

// Logout and clear the cookie
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/`);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
