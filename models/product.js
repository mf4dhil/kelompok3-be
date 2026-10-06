import { DataTypes } from 'sequelize';
import db from '../config/dababase.js';
import Categories from './categories.js';
import Type from './type.js';
import ProductVariant from './productvariants.js';
import Shape from './shape.js';
import Size from './size.js';
import Flavor from './flavors.js';

const Product = db.define(
  'products',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    description: {
      type: DataTypes.TEXT,
    },

    image: {
      type: DataTypes.STRING,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'products',
    timestamps: false,
  },
);

export default Product;

Categories.hasMany(Type, {
  foreignKey: 'category_id',
});

Type.belongsTo(Categories, {
  foreignKey: 'category_id',
});

// Type 1 : N Product
Type.hasMany(Product, {
  foreignKey: 'type_id',
});

Product.belongsTo(Type, {
  foreignKey: 'type_id',
});

// Product 1 : N ProductVariant
Product.hasMany(ProductVariant, {
  foreignKey: 'product_id',
});

ProductVariant.belongsTo(Product, {
  foreignKey: 'product_id',
});

// Shape 1 : N ProductVariant
Shape.hasMany(ProductVariant, {
  foreignKey: 'shape_id',
});

ProductVariant.belongsTo(Shape, {
  foreignKey: 'shape_id',
});

// Size 1 : N ProductVariant
Size.hasMany(ProductVariant, {
  foreignKey: 'size_id',
});

ProductVariant.belongsTo(Size, {
  foreignKey: 'size_id',
});

// Flavor 1 : N ProductVariant
Flavor.hasMany(ProductVariant, {
  foreignKey: 'flavor_id',
});

ProductVariant.belongsTo(Flavor, {
  foreignKey: 'flavor_id',
});
