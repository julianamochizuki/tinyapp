const { assert } = require('chai');
const { getUserByEmail, generateRandomString, urlsForUser } = require('../helpers.js');

const testUsers = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

const testUrlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "aH45JH"
  },
  "ism5xK": {
    longURL: "http://www.google.com",
    userId: "jaG38G"
  },
  "Gah48g": {
    longURL: "http://www.example.com",
    userId: "jaG38G"
  }
};

describe('getUserByEmail', function() {
  it('should return a user with valid email', function() {
    const user = getUserByEmail("user@example.com", testUsers);
    const expectedUserID = "userRandomID";
    assert.deepEqual(user, testUsers[expectedUserID]);
  });

  it('should not return a user if email is not in the database', function() {
    const user = getUserByEmail("user3@example.com", testUsers);
    const expectedOutput = null;
    assert.strictEqual(user, expectedOutput);
  });
});

describe('generateRandomString', function() {
  it('should return a string', function() {
    const randomString = generateRandomString();
    const expectedType = "string";
    assert.strictEqual(typeof randomString, expectedType);
  });

  it('should return a data with 6 characters', function() {
    const randomString = generateRandomString();
    const expectedLength = 6;
    assert.strictEqual(randomString.length, expectedLength);
  });

  it('should return a new random string when the function is invoked multiple times', function() {
    const randomString1 = generateRandomString();
    const randomString2 = generateRandomString();
    assert.notStrictEqual(randomString1, randomString2);
  });
});

describe('urlsForUser', function() {
  it('should return the url database for the user', function() {
    const urlsDatabaseForUser = urlsForUser("jaG38G", testUrlDatabase);
    const expectedUrls = {
      "ism5xK": {
        longURL: "http://www.google.com",
      },
      "Gah48g": {
        longURL: "http://www.example.com",
      }
    };
    assert.deepEqual(urlsDatabaseForUser, expectedUrls);
  });

  it('should not return the urls of other users\' database', function() {
    const urlsDatabaseForUser = urlsForUser("jaG38G", testUrlDatabase);
    const urlOfOtherUser = "b2xVn2";
    assert.strictEqual((urlOfOtherUser in urlsDatabaseForUser), false);
  });

  it('should return an empty object if there is no data in the user\'s database', function() {
    const urlsDatabaseForUser = urlsForUser("sjf72D", testUrlDatabase);
    const expectedOutput = {};
    assert.deepEqual(urlsDatabaseForUser, expectedOutput);
  });
});