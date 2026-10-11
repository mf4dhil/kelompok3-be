import Flavor from "../models/flavors.js";
import createCrudController from "./createCrudController.js";

const controller = createCrudController({ model: Flavor, label: "Flavor" });

export const getFlavors = controller.getAll;
export const getFlavorById = controller.getById;
export const createFlavor = controller.create;
export const updateFlavor = controller.update;
export const deleteFlavor = controller.remove;
