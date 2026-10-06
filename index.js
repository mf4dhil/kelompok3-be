import express from "express";
import cors from "cors";

// Models
import Product from "./models/product.js";
import Type from "./models/type.js";
import Categories from "./models/categories.js";
import ProductVariant from "./models/productvariants.js";
import Shape from "./models/shape.js";
import Size from "./models/size.js";
import Flavor from "./models/flavors.js";

// Routes
import productRoute from "./routes/productRoute.js";
import categoriesRoute from "./routes/categoriesRoute.js";
import typeRoute from "./routes/typeRoute.js";
import shapeRoute from "./routes/shapeRoute.js";
import sizeRoute from "./routes/sizeRoute.js";
import flavorRoute from "./routes/flavorRoute.js";
import productvariantRoute from "./routes/productvariantRoute.js";

import db from "./config/dababase.js";

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// Categories 1 : N Type (Pastikan foreignKey sesuai nama kolom DB)
Categories.hasMany(Type, {
  foreignKey: "category_id",
});

Type.belongsTo(Categories, {
  foreignKey: "category_id",
});

// Type 1 : N Product
Type.hasMany(Product, {
  foreignKey: "type_id",
});

Product.belongsTo(Type, {
  foreignKey: "type_id",
});

// Product 1 : N ProductVariant
Product.hasMany(ProductVariant, {
  foreignKey: "product_id",
});

ProductVariant.belongsTo(Product, {
  foreignKey: "product_id",
});

// Shape 1 : N ProductVariant
Shape.hasMany(ProductVariant, {
  foreignKey: "shape_id",
});

ProductVariant.belongsTo(Shape, {
  foreignKey: "shape_id",
});

// Size 1 : N ProductVariant
Size.hasMany(ProductVariant, {
  foreignKey: "size_id",
});

ProductVariant.belongsTo(Size, {
  foreignKey: "size_id",
});

// Flavor 1 : N ProductVariant
Flavor.hasMany(ProductVariant, {
  foreignKey: "flavor_id",
});

ProductVariant.belongsTo(Flavor, {
  foreignKey: "flavor_id",
});

app.use("/api", productRoute);
app.use("/api", categoriesRoute);
app.use("/api", typeRoute);
app.use("/api", shapeRoute);
app.use("/api", sizeRoute);
app.use("/api", flavorRoute);
app.use("/api", productvariantRoute);

app.get("/", (req, res) => {
  res.json({
    message: "API Product PO Kue aktif",
  });
});

db.authenticate()
  .then(() => {
    console.log("Database connected");
    return db.sync();
  })
  .then(() => {
    console.log("Database berhasil disinkronkan");
    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Gagal terhubung ke database:", error);
  });