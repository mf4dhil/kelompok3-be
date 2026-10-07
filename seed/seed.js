import bcrypt from 'bcrypt';
import db from '../config/dababase.js';
import User from '../models/user.model.js';
import Categories from '../models/categories.js';
import Type from '../models/type.js';
import Product from '../models/product.js';
import ProductVariant from '../models/productvariants.js';
import Flavor from '../models/flavors.js';
import Shape from '../models/shape.js';
import Size from '../models/size.js';

const seed = async () => {
  try {
    await db.authenticate();
    await db.sync({ force: true }); // force re-create tables with new schema

    console.log('Starting seed...');

    // 1. Seed Categories
    const [catSignature, createdSig] = await Categories.findOrCreate({
      where: { name: 'Signature' },
      defaults: { name: 'Signature', slug: 'signature', is_active: true }
    });

    const [catFavorit, createdFav] = await Categories.findOrCreate({
      where: { name: 'Favorit' },
      defaults: { name: 'Favorit', slug: 'favorit', is_active: true }
    });

    console.log('Categories seeded:', catSignature.name, catFavorit.name);

    // 2. Seed Types linked to categories
    const [typeSig, createdTypeSig] = await Type.findOrCreate({
      where: { name: 'Signature Classic', category_id: catSignature.id },
      defaults: { name: 'Signature Classic', slug: 'signature-classic', category_id: catSignature.id, is_active: true }
    });

    const [typeApel, createdTypeApel] = await Type.findOrCreate({
      where: { name: 'Kue Apel', category_id: catFavorit.id },
      defaults: { name: 'Kue Apel', slug: 'kue-apel', category_id: catFavorit.id, is_active: true }
    });

    const [typeChoco, createdTypeChoco] = await Type.findOrCreate({
      where: { name: 'Kue Coklat', category_id: catSignature.id },
      defaults: { name: 'Kue Coklat', slug: 'kue-coklat', category_id: catSignature.id, is_active: true }
    });

    const [typeMerah, createdTypeMerah] = await Type.findOrCreate({
      where: { name: 'Kue Merah', category_id: catFavorit.id },
      defaults: { name: 'Kue Merah', slug: 'kue-merah', category_id: catFavorit.id, is_active: true }
    });

    console.log('Types seeded');

    // 3. Seed Flavors
    const [flavorChoco, createdChoco] = await Flavor.findOrCreate({
      where: { name: 'Chocolate' },
      defaults: { name: 'Chocolate', slug: 'chocolate', is_active: true }
    });

    const [flavorVanilla, createdVanilla] = await Flavor.findOrCreate({
      where: { name: 'Vanilla' },
      defaults: { name: 'Vanilla', slug: 'vanilla', is_active: true }
    });

    const [flavorStrawberry, createdStrawb] = await Flavor.findOrCreate({
      where: { name: 'Strawberry' },
      defaults: { name: 'Strawberry', slug: 'strawberry', is_active: true }
    });

    const [flavorMatcha, createdMatcha] = await Flavor.findOrCreate({
      where: { name: 'Matcha' },
      defaults: { name: 'Matcha', slug: 'matcha', is_active: true }
    });

    console.log('Flavors seeded');

    // 4. Seed Shapes
    const [shapeBulu, createdBulu] = await Shape.findOrCreate({
      where: { name: 'Bulu' },
      defaults: { name: 'Bulu', slug: 'bulu', is_active: true }
    });

    const [shapePersegi, createdPersegi] = await Shape.findOrCreate({
      where: { name: 'Persegi' },
      defaults: { name: 'Persegi', slug: 'persegi', is_active: true }
    });

    const [shapeBalok, createdBalok] = await Shape.findOrCreate({
      where: { name: 'Balok' },
      defaults: { name: 'Balok', slug: 'balok', is_active: true }
    });

    console.log('Shapes seeded');

    // 5. Seed Sizes
    const [sizeS, createdS] = await Size.findOrCreate({
      where: { name: 'S', value: 65000, unit: 'rb' },
      defaults: { name: 'S', value: 65000, unit: 'rb', is_active: true }
    });

    const [sizeM, createdM] = await Size.findOrCreate({
      where: { name: 'M', value: 85000, unit: 'rb' },
      defaults: { name: 'M', value: 85000, unit: 'rb', is_active: true }
    });

    const [sizeL, createdL] = await Size.findOrCreate({
      where: { name: 'L', value: 125000, unit: 'rb' },
      defaults: { name: 'L', value: 125000, unit: 'rb', is_active: true }
    });

    const [sizeXL, createdXL] = await Size.findOrCreate({
      where: { name: 'XL', value: 185000, unit: 'rb' },
      defaults: { name: 'XL', value: 185000, unit: 'rb', is_active: true }
    });

    console.log('Sizes seeded');

    // 6. Seed Products with ProductVariants
    // Product 1: Signature Classic (using typeSig)
    const product1 = await Product.create({
      name: 'Signature Classic',
      slug: 'signature-classic',
      description: 'Klasik favorit cita semua',
      type_id: typeSig.id,
      is_active: true,
    });

    // Create variant with all required fields: shape_id, size_id, flavor_id, price, is_active
    const variant1 = await ProductVariant.create({
      product_id: product1.id,
      shape_id: shapeBulu.id,
      size_id: sizeS.id,
      flavor_id: flavorChoco.id,
      price: 89000,
      is_active: true,
    });

    // Product 2: Rainbow Fondant
    const product2 = await Product.create({
      name: 'Rainbow Fondant',
      slug: 'rainbow-fondant',
      description: 'Hasil warna pelangi mewah',
      type_id: typeSig.id,
      is_active: true,
    });

    const variant2 = await ProductVariant.create({
      product_id: product2.id,
      shape_id: shapePersegi.id,
      size_id: sizeL.id,
      flavor_id: flavorMatcha.id,
      price: 125000,
      is_active: true,
    });

    // Product 3: Kue Apel (using typeApel)
    const product3 = await Product.create({
      name: 'Kue Apel',
      slug: 'kue-apel',
      description: 'Pelapis renyah & isi manis',
      type_id: typeApel.id,
      is_active: true,
    });

    const variant3 = await ProductVariant.create({
      product_id: product3.id,
      shape_id: shapeBalok.id,
      size_id: sizeS.id,
      flavor_id: flavorStrawberry.id,
      price: 65000,
      is_active: true,
    });

    // Product 4: Oreo Cream
    const product4 = await Product.create({
      name: 'Oreo Cream',
      slug: 'oreo-cream',
      description: 'Oreo garing & cream lembut',
      type_id: typeApel.id,
      is_active: true,
    });

    const variant4 = await ProductVariant.create({
      product_id: product4.id,
      shape_id: shapePersegi.id,
      size_id: sizeM.id,
      flavor_id: flavorChoco.id,
      price: 72000,
      is_active: true,
    });

    // Product 5: Chocolate Hazelnut (using typeChoco)
    const product5 = await Product.create({
      name: 'Chocolate Hazelnut',
      slug: 'chocolate-hazelnut',
      description: 'Chocolate & hazelnut premium',
      type_id: typeChoco.id,
      is_active: true,
    });

    const variant5 = await ProductVariant.create({
      product_id: product5.id,
      shape_id: shapeBulu.id,
      size_id: sizeXL.id,
      flavor_id: flavorChoco.id,
      price: 95000,
      is_active: true,
    });

    // Product 6: Red Velvet (using typeMerah)
    const product6 = await Product.create({
      name: 'Red Velvet',
      slug: 'red-velvet',
      description: 'Velvet merah & cream cheese',
      type_id: typeMerah.id,
      is_active: true,
    });

    const variant6 = await ProductVariant.create({
      product_id: product6.id,
      shape_id: shapeBalok.id,
      size_id: sizeM.id,
      flavor_id: flavorVanilla.id,
      price: 88000,
      is_active: true,
    });

    console.log('Products and Variants seeded');

    // 7. Seed Admin User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const [adminUser, created] = await User.findOrCreate({
      where: { email: 'admin@example.com' },
      defaults: {
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '081234567890',
        password: hashedPassword,
        address: 'Jakarta, Indonesia',
        role: 'admin',
      },
    });

    if (created) {
      console.log('Admin user seeded:', adminUser.name);
    } else {
      console.log('Admin user already exists');
    }

    console.log('\n✅ Seed data selesai semuanya!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();