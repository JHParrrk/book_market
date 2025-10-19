const categoryRepository = require("./category.repository");

exports.getAllCategories = () => categoryRepository.findAll();
