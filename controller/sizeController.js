import Size from "../models/size.js";
import createCrudController from "./createCrudController.js";

const controller = createCrudController({ model: Size, label: "Size" });

export const getSizes = controller.getAll;
export const getSizeById = controller.getById;
export const createSize = controller.create;
export const updateSize = controller.update;
export const deleteSize = controller.remove;
