import { memo } from "react";
import { Text, Badge, Button, InlineStack } from "@shopify/polaris";

interface ProductRowProps {
  product: {
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
  };
  onOpenCustomization: (product: any) => void;
  onAssignTemplate: (productId: string) => void;
  onRemoveTemplate: (productId: string) => void;
  selectedTemplate: string;
}

// Memoized ProductRow component to prevent unnecessary re-renders
export const ProductRow = memo(({ 
  product, 
  onOpenCustomization, 
  onAssignTemplate, 
  onRemoveTemplate, 
  selectedTemplate 
}: ProductRowProps) => {
  return [
    <div key={product.node.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {product.node.images.edges[0] && (
        <img
          src={product.node.images.edges[0].node.url}
          alt={product.node.images.edges[0].node.altText || product.node.title}
          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
          loading="lazy" // Lazy loading optimization
          decoding="async" // Async image decoding
        />
      )}
      <div>
        <button
          onClick={() => onOpenCustomization(product.node)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            <span style={{ color: '#007bff', textDecoration: 'underline' }}>
              {product.node.title}
            </span>
          </Text>
        </button>
        <br />
        <Text variant="bodySm" tone="subdued" as="span">
          {product.node.handle}
        </Text>
      </div>
    </div>,
    <Badge key={`status-${product.node.id}`} tone={product.node.status === 'ACTIVE' ? 'success' : 'critical'}>
      {product.node.status}
    </Badge>,
    product.node.totalInventory || 0,
    <Badge key={`template-${product.node.id}`} tone="info">
      No Template
    </Badge>,
    <InlineStack key={`actions-${product.node.id}`} gap="200">
      <Button
        size="slim"
        variant="primary"
        onClick={() => onOpenCustomization(product.node)}
      >
        Add
      </Button>
      <Button
        size="slim"
        variant="secondary"
        onClick={() => onOpenCustomization(product.node)}
      >
        Edit
      </Button>
      <Button
        size="slim"
        onClick={() => onAssignTemplate(product.node.id)}
        disabled={!selectedTemplate}
      >
        Assign
      </Button>
      <Button
        size="slim"
        variant="plain"
        tone="critical"
        onClick={() => onRemoveTemplate(product.node.id)}
      >
        Remove
      </Button>
    </InlineStack>,
  ];
});

ProductRow.displayName = 'ProductRow';