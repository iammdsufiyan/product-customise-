import { memo, useMemo, useState, useCallback } from "react";
import { DataTable, Card, BlockStack, Text, Button, InlineStack } from "@shopify/polaris";
import { ProductRow } from "./ProductRow";

interface Product {
  node: {
    id: string;
    title: string;
    handle: string;
    status: string;
    totalInventory: number;
    images: {
      edges: Array<{
        node: {
          url: string;
          altText?: string;
        };
      }>;
    };
  };
}

interface VirtualizedProductListProps {
  products: Product[];
  selectedTemplate: string;
  onOpenCustomization: (product: any) => void;
  onAssignTemplate: (productId: string) => void;
  onRemoveTemplate: (productId: string) => void;
}

const ITEMS_PER_PAGE = 20;

export const VirtualizedProductList = memo(({
  products,
  selectedTemplate,
  onOpenCustomization,
  onAssignTemplate,
  onRemoveTemplate
}: VirtualizedProductListProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  
  // Get current page items
  const currentPageProducts = useMemo(() => {
    return products.slice(startIndex, endIndex);
  }, [products, startIndex, endIndex]);

  // Generate table rows for current page
  const productRows = useMemo(() => {
    return currentPageProducts.map((product) => {
      const rowData = ProductRow({
        product,
        onOpenCustomization,
        onAssignTemplate,
        onRemoveTemplate,
        selectedTemplate
      });
      return rowData as any[]; // Type assertion for DataTable compatibility
    });
  }, [currentPageProducts, onOpenCustomization, onAssignTemplate, onRemoveTemplate, selectedTemplate]);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handlePageClick = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }, [currentPage, totalPages]);

  if (products.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text variant="bodyMd" tone="subdued" as="p">
            No products found.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h2">
            Products ({products.length})
          </Text>
          <Text variant="bodySm" tone="subdued" as="p">
            Showing {startIndex + 1}-{Math.min(endIndex, products.length)} of {products.length}
          </Text>
        </InlineStack>
        
        <DataTable
          columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
          headings={['Product', 'Status', 'Inventory', 'Current Template', 'Actions']}
          rows={productRows}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <InlineStack align="center" gap="200">
            <Button
              size="slim"
              disabled={currentPage === 1}
              onClick={handlePreviousPage}
            >
              Previous
            </Button>
            
            <InlineStack gap="100">
              {pageNumbers.map((pageNum) => (
                <Button
                  key={pageNum}
                  size="slim"
                  variant={currentPage === pageNum ? "primary" : "secondary"}
                  onClick={() => handlePageClick(pageNum)}
                >
                  {pageNum.toString()}
                </Button>
              ))}
            </InlineStack>
            
            <Button
              size="slim"
              disabled={currentPage === totalPages}
              onClick={handleNextPage}
            >
              Next
            </Button>
          </InlineStack>
        )}

        {/* Performance Info */}
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: '#f6f6f7', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#6d7175'
        }}>
          Performance: Showing {ITEMS_PER_PAGE} items per page for optimal performance
        </div>
      </BlockStack>
    </Card>
  );
});

VirtualizedProductList.displayName = 'VirtualizedProductList';