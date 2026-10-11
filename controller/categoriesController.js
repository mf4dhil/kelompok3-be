import Categories from "../models/categories.js";
import createCrudController from "./createCrudController.js";

const controller = createCrudController({ model: Categories, label: "categories" });

export const getCategories = controller.getAll;
export const getcategoriesById = controller.getById;
export const createcategories = controller.create;
export const updatecategories = controller.update;
export const deletecategories = controller.remove;
