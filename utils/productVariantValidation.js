export const getVariantCombinationKey = ({ shape_id, size_id, flavor_id }) =>
  `${shape_id}-${size_id}-${flavor_id}`;

export const getVariantValidationError = (variants) => {
  for (const variant of variants) {
    if (
      !variant.shape_id ||
      !variant.size_id ||
      !variant.flavor_id ||
      variant.price === undefined
    ) {
      return "Setiap variant harus memiliki shape_id, size_id, flavor_id, dan price";
    }

    if (typeof variant.price !== "number" || variant.price < 0) {
      return "Harga variant harus berupa angka positif";
    }
  }

  return null;
};
