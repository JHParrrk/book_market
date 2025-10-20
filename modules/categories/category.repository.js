const dbPool = require("../../database/connection/mariaDB");

exports.findAll = async () => {
  const [categories] = await dbPool.query("SELECT * FROM categories");
  return categories;
};
