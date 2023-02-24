const getUserByEmail = function(email, database) {
  for (const key in database) {
    if (database[key]["email"] === email) {
      return database[key];
    }
  }
  return null;
};

const generateRandomString = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = "";
  for (let i = 0; i < 6; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
};

const urlsForUser = function(id, database) {
  let result = {};
  for (const key in database) {
    if (database[key].userId === id) {
      result[key] = {
        longURL: database[key].longURL,
        dateCreated: database[key].dateCreated,
        accessCount: database[key].accessCount,
        uniqueVisits: database[key].uniqueVisits
      };
    }
  }
  return result;
};

module.exports = {
  getUserByEmail,
  generateRandomString,
  urlsForUser
};