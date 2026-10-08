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
    await db.sync(); // sync tanpa force: true agar aman dari foreign key constraint

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

    // 5. Seed Sizes (ukuran fisik produk, bukan harga)
    const [sizeS, createdS] = await Size.findOrCreate({
      where: { name: '20 cm' },
      defaults: { name: '20 cm', value: 20, unit: 'cm', is_active: true }
    });

    const [sizeM, createdM] = await Size.findOrCreate({
      where: { name: '24 cm' },
      defaults: { name: '24 cm', value: 24, unit: 'cm', is_active: true }
    });

    const [sizeL, createdL] = await Size.findOrCreate({
      where: { name: '28 cm' },
      defaults: { name: '28 cm', value: 28, unit: 'cm', is_active: true }
    });

    const [sizeXL, createdXL] = await Size.findOrCreate({
      where: { name: '30 cm' },
      defaults: { name: '30 cm', value: 30, unit: 'cm', is_active: true }
    });

    console.log('Sizes seeded');

    // 6. Seed Products with ProductVariants (idempotent: findOrCreate)
    const productsData = [
      { name: 'Signature Classic', slug: 'signature-classic', description: 'Klasik favorit cita semua', type_id: typeSig.id, variant: { shape_id: shapeBulu.id, size_id: sizeS.id, flavor_id: flavorChoco.id, price: 89000 } },
      { name: 'Rainbow Fondant', slug: 'rainbow-fondant', description: 'Hasil warna pelangi mewah', type_id: typeSig.id, variant: { shape_id: shapePersegi.id, size_id: sizeL.id, flavor_id: flavorMatcha.id, price: 125000 } },
      { name: 'Kue Apel', slug: 'kue-apel', description: 'Pelapis renyah & isi manis', type_id: typeApel.id, variant: { shape_id: shapeBalok.id, size_id: sizeS.id, flavor_id: flavorStrawberry.id, price: 65000 } },
      { name: 'Oreo Cream', slug: 'oreo-cream', description: 'Oreo garing & cream lembut', type_id: typeApel.id, variant: { shape_id: shapePersegi.id, size_id: sizeM.id, flavor_id: flavorChoco.id, price: 72000 } },
      { name: 'Chocolate Hazelnut', slug: 'chocolate-hazelnut', description: 'Chocolate & hazelnut premium', type_id: typeChoco.id, variant: { shape_id: shapeBulu.id, size_id: sizeXL.id, flavor_id: flavorChoco.id, price: 95000 } },
      { name: 'Red Velvet', slug: 'red-velvet', description: 'Velvet merah & cream cheese', type_id: typeMerah.id, variant: { shape_id: shapeBalok.id, size_id: sizeM.id, flavor_id: flavorVanilla.id, price: 88000 } },
    ];

    for (const pd of productsData) {
      const [product] = await Product.findOrCreate({
        where: { slug: pd.slug },
        defaults: { name: pd.name, slug: pd.slug, description: pd.description, type_id: pd.type_id, is_active: true },
      });
      await ProductVariant.findOrCreate({
        where: { product_id: product.id, shape_id: pd.variant.shape_id, size_id: pd.variant.size_id, flavor_id: pd.variant.flavor_id },
        defaults: { ...pd.variant, product_id: product.id, is_active: true },
      });
    }

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