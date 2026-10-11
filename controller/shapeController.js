import Shape from "../models/shape.js";
import createCrudController from "./createCrudController.js";

const controller = createCrudController({ model: Shape, label: "Shape" });

export const getShapes = controller.getAll;
export const getShapeById = controller.getById;
export const createShape = controller.create;
export const updateShape = controller.update;
export const deleteShape = controller.remove;
