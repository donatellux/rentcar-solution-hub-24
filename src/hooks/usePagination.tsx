import { useState, useMemo } from 'react';

interface UsePaginationProps {
  data: any[];
  itemsPerPage: number;
}

export const usePagination = ({ data, itemsPerPage }: UsePaginationProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const totalItems = data.length;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const reset = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    reset,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};