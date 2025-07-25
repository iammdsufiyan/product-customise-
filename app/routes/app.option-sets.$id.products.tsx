import { json, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useParams } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { 
  Card, 
  Page, 
  Layout, 
  Text, 
  Button, 
  DataTable, 
  TextField,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  Checkbox,
  EmptyState
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { SearchIcon } from "@shopify/polaris-icons";
import db from "../db.server";

interface Product {
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
}

interface LinkedProduct {
  id: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  isActive: boolean;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const optionSetId = params.id;

  if (!optionSetId) {
    throw new Response("Option Set ID is required", { status: 400 });
  }

  try {
    // Get the option set
    const optionSet = await db.optionSet.findUnique({
      where: { id: optionSetId }
    });

    if (!optionSet) {
      throw new Response("Option Set not found", { status: 404 });
    }

    // Get linked products
    const linkedProducts = await db.productOptionSet.findMany({
      where: { optionSetId },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch products from Shopify
    const productsResponse = await admin.graphql(`
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              totalInventory
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `, {
      variables: {
        first: 100,
      },
    });

    const productsData = await productsResponse.json();
    const products = productsData.data?.products?.edges || [];

    return json({
      optionSet,
      linkedProducts,
      products,
    });
  } catch (error) {
    console.error('Error loading products:', error);
    return json({
      optionSet: null,
      linkedProducts: [],
      products: [],
    });
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const optionSetId = params.id;
  
  if (!optionSetId) {
    throw new Response("Option Set ID is required", { status: 400 });
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    if (action === "link") {
      const productId = formData.get("productId") as string;
      const productTitle = formData.get("productTitle") as string;
      const productHandle = formData.get("productHandle") as string;

      // Check if already linked
      const existing = await db.productOptionSet.findUnique({
        where: {
          productId_optionSetId: {
            productId,
            optionSetId
          }
        }
      });

      if (existing) {
        return json({ success: false, message: "Product is already linked to this option set" });
      }

      await db.productOptionSet.create({
        data: {
          productId,
          productTitle,
          productHandle,
          optionSetId,
          isActive: true
        }
      });
      
      return json({ 
        success: true, 
        message: "Product linked successfully!" 
      });
    }

    if (action === "unlink") {
      const productId = formData.get("productId") as string;
      
      await db.productOptionSet.delete({
        where: {
          productId_optionSetId: {
            productId,
            optionSetId
          }
        }
      });
      
      return json({ success: true, message: "Product unlinked successfully!" });
    }

    if (action === "toggle") {
      const productId = formData.get("productId") as string;
      const isActive = formData.get("isActive") === "true";
      
      await db.productOptionSet.update({
        where: {
          productId_optionSetId: {
            productId,
            optionSetId
          }
        },
        data: { isActive }
      });
      
      return json({ success: true, message: "Product status updated!" });
    }

    return json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error('Error performing action:', error);
    return json({ success: false, message: "An error occurred. Please try again." });
  }
};

export default function OptionSetProducts() {
  const { optionSet, linkedProducts, products } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const params = useParams();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const linkedProductIds = linkedProducts.map((lp: LinkedProduct) => lp.productId);
  
  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.node.handle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const availableProducts = filteredProducts.filter((product: any) => 
    !linkedProductIds.includes(product.node.id)
  );

  const handleLinkProduct = useCallback((product: any) => {
    const formData = new FormData();
    formData.append("action", "link");
    formData.append("productId", product.node.id);
    formData.append("productTitle", product.node.title);
    formData.append("productHandle", product.node.handle);
    
    submit(formData, { method: "post" });
  }, [submit]);

  const handleUnlinkProduct = useCallback((productId: string) => {
    const formData = new FormData();
    formData.append("action", "unlink");
    formData.append("productId", productId);
    
    submit(formData, { method: "post" });
  }, [submit]);

  const handleToggleProduct = useCallback((productId: string, currentStatus: boolean) => {
    const formData = new FormData();
    formData.append("action", "toggle");
    formData.append("productId", productId);
    formData.append("isActive", (!currentStatus).toString());
    
    submit(formData, { method: "post" });
  }, [submit]);

  const handleBulkLink = useCallback(() => {
    selectedProducts.forEach(productId => {
      const product = availableProducts.find((p: any) => p.node.id === productId);
      if (product) {
        handleLinkProduct(product);
      }
    });
    setSelectedProducts([]);
  }, [selectedProducts, availableProducts, handleLinkProduct]);

  const handleSelectProduct = useCallback((productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  }, [selectedProducts]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedProducts(availableProducts.map((p: any) => p.node.id));
    } else {
      setSelectedProducts([]);
    }
  }, [availableProducts]);

  const linkedProductRows = linkedProducts.map((linkedProduct: LinkedProduct) => [
    <div key={linkedProduct.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {linkedProduct.productTitle}
        </Text>
        <br />
        <Text variant="bodySm" tone="subdued" as="span">
          {linkedProduct.productHandle}
        </Text>
      </div>
    </div>,
    <Badge key={`status-${linkedProduct.id}`} tone={linkedProduct.isActive ? 'success' : 'warning'}>
      {linkedProduct.isActive ? 'Active' : 'Inactive'}
    </Badge>,
    <InlineStack key={`actions-${linkedProduct.id}`} gap="200">
      <Button 
        size="slim" 
        onClick={() => handleToggleProduct(linkedProduct.productId, linkedProduct.isActive)}
      >
        {linkedProduct.isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <Button 
        size="slim" 
        variant="plain" 
        tone="critical"
        onClick={() => handleUnlinkProduct(linkedProduct.productId)}
      >
        Unlink
      </Button>
    </InlineStack>,
  ]);

  const availableProductRows = availableProducts.map((product: any) => [
    <Checkbox
      key={`checkbox-${product.node.id}`}
      checked={selectedProducts.includes(product.node.id)}
      onChange={(checked) => handleSelectProduct(product.node.id, checked)}
    />,
    <div key={product.node.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {product.node.images.edges[0] && (
        <img 
          src={product.node.images.edges[0].node.url} 
          alt={product.node.images.edges[0].node.altText || product.node.title}
          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
        />
      )}
      <div>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {product.node.title}
        </Text>
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
    <Button 
      key={`link-${product.node.id}`}
      size="slim" 
      onClick={() => handleLinkProduct(product)}
    >
      Link
    </Button>,
  ]);

  if (!optionSet) {
    return (
      <Page title="Option Set Not Found">
        <EmptyState
          heading="Option set not found"
          action={{ content: 'Go back', url: '/app/option-sets' }}
        >
          <p>The option set you're looking for doesn't exist.</p>
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page
      title={`Link products to "${optionSet.name}"`}
      backAction={{ url: "/app/option-sets" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Linked Products ({linkedProducts.length})
              </Text>
              
              {linkedProducts.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text']}
                  headings={['Product', 'Status', 'Actions']}
                  rows={linkedProductRows}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    No products linked yet. Link products from the available products below.
                  </Text>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="400" align="space-between">
                <Text variant="headingMd" as="h2">
                  Available Products ({availableProducts.length})
                </Text>
                {selectedProducts.length > 0 && (
                  <Button onClick={handleBulkLink}>
                    Link {selectedProducts.length} selected
                  </Button>
                )}
              </InlineStack>
              
              <TextField
                label="Search Products"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by product name or handle..."
                prefix={<SearchIcon />}
                autoComplete="off"
              />

              {availableProducts.length > 0 ? (
                <>
                  <InlineStack gap="200">
                    <Checkbox
                      label={`Select all (${availableProducts.length})`}
                      checked={selectedProducts.length === availableProducts.length}
                      indeterminate={selectedProducts.length > 0 && selectedProducts.length < availableProducts.length}
                      onChange={handleSelectAll}
                    />
                  </InlineStack>
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'numeric', 'text']}
                    headings={['', 'Product', 'Status', 'Inventory', 'Actions']}
                    rows={availableProductRows}
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    {searchQuery ? 'No products found matching your search.' : 'All products are already linked to this option set.'}
                  </Text>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}