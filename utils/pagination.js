export const getPagination = (page, limit) => {
  const currentPage = parseInt(page);
  const pageSize = parseInt(limit);

  return {
    currentPage,
    pageSize,
    offset: (currentPage - 1) * pageSize,
  };
};

export const getPaginationMeta = (totalItems, currentPage, pageSize) => ({
  currentPage,
  totalPages: Math.ceil(totalItems / pageSize),
  totalItems,
});
