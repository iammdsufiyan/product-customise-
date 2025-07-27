import { json, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
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
  Filters,
  ChoiceList,
  RangeSlider,
  Tabs,
  Select,
  Modal,
  ColorPicker,
  Divider,
  Box
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { SearchIcon, FilterIcon } from "@shopify/polaris-icons";

interface Product {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  tags: string[];
  totalInventory: number;
  hasOptions: boolean;
  images: {
    edges: Array<{
      node: {
        url: string;
        altText?: string;
      };
    }>;
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Fetch existing option sets (templates) from database
    const productOptionSets = await db.productOptionSet.findMany({
      where: {
        isActive: true
      },
      include: {
        optionSet: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Fetch products from Shopify using GraphQL
    const productsResponse = await admin.graphql(`
      query getProducts($first: Int!) {
        products(first: $first, query: "status:active") {
          edges {
            node {
              id
              title
              handle
              status
              vendor
              tags
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
        first: 100, // Fetch up to 100 products
      },
    });

    const productsData = await productsResponse.json();
    const products = productsData.data?.products?.edges || [];

    // Transform products data and check if they have templates
    const transformedProducts: Product[] = products.map((product: any) => {
      const cleanProductId = product.node.id.replace('gid://shopify/Product/', '');
      const hasTemplate = productOptionSets.some(pos => pos.productId === cleanProductId);
      
      return {
        id: product.node.id,
        title: product.node.title,
        handle: product.node.handle,
        status: product.node.status,
        vendor: product.node.vendor || 'booksss12345',
        tags: product.node.tags || [],
        totalInventory: product.node.totalInventory || 0,
        hasOptions: hasTemplate,
        images: product.node.images
      };
    });

    return json({
      products: transformedProducts,
      templates: productOptionSets
    });
  } catch (error) {
    console.error('Error loading products and templates:', error);
    return json({ products: [], templates: [] });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const productId = formData.get("productId") as string;

  try {
    if (action === "add_options") {
      // Add options to product - create a basic template
      console.log(`Adding options to product: ${productId}`);
      
      // Get product details from Shopify
      const productResponse = await admin.graphql(`
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
          }
        }
      `, {
        variables: { id: productId }
      });
      
      const productData = await productResponse.json();
      const product = productData.data?.product;
      
      if (product) {
        // Create a default option set
        const defaultTemplate = {
          elements: [
            {
              id: 'text_1',
              type: 'singletext',
              x: 300,
              y: 400,
              width: 400,
              height: 50,
              properties: {
                text: 'Your Name',
                placeholder: 'Enter your name...',
                fontSize: 24,
                fontFamily: 'Arial',
                color: '#000000',
                bold: true,
                maxLength: 30,
                required: false,
                multiline: false
              }
            }
          ],
          canvasWidth: 1000,
          canvasHeight: 1000,
          viewBackground: 'blank',
          livePreview: true,
          additionalCharge: 0
        };

        // Save to database
        const optionSet = await db.optionSet.create({
          data: {
            name: `${product.title} Customization`,
            description: `Customization options for ${product.title}`,
            fields: JSON.stringify(defaultTemplate),
            isActive: true
          }
        });

        await db.productOptionSet.create({
          data: {
            productId: productId.replace('gid://shopify/Product/', ''),
            productTitle: product.title,
            productHandle: product.handle,
            optionSetId: optionSet.id,
            isActive: true
          }
        });
      }
      
      return json({
        success: true,
        message: "Options added to product successfully!"
      });
    }

    if (action === "edit_options") {
      // Save template data from the editor
      const templateData = formData.get("templateData") as string;
      console.log(`Editing options for product: ${productId}`);
      
      if (templateData) {
        const cleanProductId = productId.replace('gid://shopify/Product/', '');
        
        // Find existing option set for this product
        const productOptionSet = await db.productOptionSet.findFirst({
          where: {
            productId: cleanProductId,
            isActive: true
          }
        });

        if (productOptionSet) {
          // Update the existing option set with new template data
          await db.optionSet.update({
            where: { id: productOptionSet.optionSetId },
            data: {
              fields: templateData,
              updatedAt: new Date()
            }
          });
          console.log(`Template updated for product: ${cleanProductId}`);
        } else {
          // Create new template if it doesn't exist
          console.log(`Creating new template for product: ${cleanProductId}`);
          
          // Get product details from Shopify
          const productResponse = await admin.graphql(`
            query getProduct($id: ID!) {
              product(id: $id) {
                id
                title
                handle
              }
            }
          `, {
            variables: { id: productId }
          });
          
          const productData = await productResponse.json();
          const product = productData.data?.product;
          
          if (product) {
            // Create new option set
            const newOptionSet = await db.optionSet.create({
              data: {
                name: `${product.title} Customization`,
                description: `Customization options for ${product.title}`,
                fields: templateData,
                isActive: true
              }
            });

            // Create product-option set relationship
            await db.productOptionSet.create({
              data: {
                productId: cleanProductId,
                productTitle: product.title,
                productHandle: product.handle,
                optionSetId: newOptionSet.id,
                isActive: true
              }
            });
            
            console.log(`New template created for product: ${cleanProductId}, optionSetId: ${newOptionSet.id}`);
          }
        }
      }
      
      return json({
        success: true,
        message: "Template saved successfully!"
      });
    }

    if (action === "toggle_options") {
      // Toggle product options status
      console.log(`Toggling options for product: ${productId}`);
      
      const productOptionSet = await db.productOptionSet.findFirst({
        where: {
          productId: productId.replace('gid://shopify/Product/', ''),
        }
      });

      if (productOptionSet) {
        await db.productOptionSet.update({
          where: { id: productOptionSet.id },
          data: { isActive: !productOptionSet.isActive }
        });
      }
      
      return json({
        success: true,
        message: "Product options status updated!"
      });
    }

    return json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error('Error performing action:', error);
    return json({ success: false, message: "An error occurred. Please try again." });
  }
};

export default function ProductOptions() {
  const { products } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [productsWithOptions, setProductsWithOptions] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [vendorFilter, setVendorFilter] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Customization editor state
  const [viewName, setViewName] = useState('Main View');
  const [canvasWidth, setCanvasWidth] = useState(1000);
  const [canvasHeight, setCanvasHeight] = useState(1000);
  const [viewBackground, setViewBackground] = useState('blank');
  const [isDesignStarted, setIsDesignStarted] = useState(false);
  const [livePreview, setLivePreview] = useState(true);
  const [customizationElements, setCustomizationElements] = useState<any[]>([]);
  const [additionalCharge, setAdditionalCharge] = useState('0');
  const [saveAsLineItems, setSaveAsLineItems] = useState(true);
  const [templateStatus, setTemplateStatus] = useState('active');

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, vendorFilter]);

  // Filter products based on search and filters
  const filteredProducts = products.filter((product: Product) => {
    const hasOptions = productsWithOptions.has(product.id);
    
    // Search filter
    const matchesSearch = searchQuery === "" ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilter.length === 0 ||
      (statusFilter.includes('with-options') && hasOptions) ||
      (statusFilter.includes('without-options') && !hasOptions);
    
    // Vendor filter
    const matchesVendor = vendorFilter.length === 0 ||
      vendorFilter.includes(product.vendor);
    
    return matchesSearch && matchesStatus && matchesVendor;
  });

  // Get unique vendors for filter options
  const uniqueVendors = [...new Set(products.map(p => p.vendor))];

  // Pagination logic
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleFilterChange = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Update pagination when itemsPerPage changes
  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  }, []);

  const handleAddOptions = useCallback((productId: string) => {
    // Add product to options set
    setProductsWithOptions(prev => new Set([...prev, productId]));
    
    const formData = new FormData();
    formData.append("action", "add_options");
    formData.append("productId", productId);
    submit(formData, { method: "post" });
  }, [submit]);

  const handleEditOptions = useCallback((productId: string) => {
    console.log('Opening edit modal for product:', productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setEditingProduct(product);
      setShowEditModal(true);
      // Reset editor state
      setIsDesignStarted(false);
      setCustomizationElements([]);
      setViewName('Main View');
      setCanvasWidth(1000);
      setCanvasHeight(1000);
      setViewBackground('blank');
      setLivePreview(true);
      setAdditionalCharge('0');
      setSaveAsLineItems(true);
      setTemplateStatus('active');
    }
  }, [products]);

  const handleStartDesign = useCallback(() => {
    setIsDesignStarted(true);
    // Start with empty canvas - no default elements
    setCustomizationElements([]);
  }, []);

  const handleAddElement = useCallback((elementType: string) => {
    const newElement = {
      id: `${elementType}_${Date.now()}`,
      type: elementType,
      x: 300,
      y: 300,
      width: elementType === 'text' || elementType === 'singletext' ? 200 : 150,
      height: elementType === 'text' ? 50 : elementType === 'singletext' ? 30 : 100,
      properties: elementType === 'text' || elementType === 'singletext' ? {
        text: elementType === 'singletext' ? 'Single Line Text' : 'Sample Text',
        placeholder: elementType === 'singletext' ? 'Enter single line text...' : 'Enter text...',
        fontSize: 18,
        fontFamily: 'Arial',
        color: '#000000',
        bold: false,
        maxLength: elementType === 'singletext' ? 30 : 50,
        required: false,
        multiline: elementType === 'text'
      } : {
        maxLength: 5,
        required: false
      }
    };
    
    setCustomizationElements(prev => [...prev, newElement]);
  }, []);

  const handleDeleteElement = useCallback((elementId: string) => {
    setCustomizationElements(prev => prev.filter(el => el.id !== elementId));
  }, []);

  const handleToggleOptions = useCallback((productId: string, currentStatus: boolean) => {
    // Toggle the options status
    if (currentStatus) {
      setProductsWithOptions(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    } else {
      setProductsWithOptions(prev => new Set([...prev, productId]));
    }
    
    const formData = new FormData();
    formData.append("action", "toggle_options");
    formData.append("productId", productId);
    submit(formData, { method: "post" });
  }, [submit]);

  const handleSelectProduct = useCallback((productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  }, [selectedProducts]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      // Select only products on current page
      const currentPageProductIds = paginatedProducts.map((p: Product) => p.id);
      setSelectedProducts([...new Set([...selectedProducts, ...currentPageProductIds])]);
    } else {
      // Deselect only products on current page
      const currentPageProductIds = paginatedProducts.map((p: Product) => p.id);
      setSelectedProducts(selectedProducts.filter(id => !currentPageProductIds.includes(id)));
    }
  }, [selectedProducts, paginatedProducts]);

  // Create table rows
  const productRows = paginatedProducts.map((product: Product) => {
    const hasOptions = productsWithOptions.has(product.id);
    
    return [
      <Checkbox
        key={`checkbox-${product.id}`}
        label=""
        checked={selectedProducts.includes(product.id)}
        onChange={(checked) => handleSelectProduct(product.id, checked)}
      />,
      <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {product.images.edges[0] && (
          <img
            src={product.images.edges[0].node.url}
            alt={product.images.edges[0].node.altText || product.title}
            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
          />
        )}
        <div>
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            {product.title}
          </Text>
        </div>
      </div>,
      product.vendor,
      product.tags.length > 0 ? product.tags.join(', ') : '-',
      <div key={`status-${product.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: hasOptions ? '#00a047' : '#e1e3e5'
        }} />
        <button
          onClick={() => handleToggleOptions(product.id, hasOptions)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer'
          }}
        >
          <span style={{
            width: '32px',
            height: '16px',
            backgroundColor: hasOptions ? '#00a047' : '#e1e3e5',
            borderRadius: '8px',
            position: 'relative',
            display: 'inline-block'
          }}>
            <span style={{
              position: 'absolute',
              [hasOptions ? 'right' : 'left']: '2px',
              top: '2px',
              width: '12px',
              height: '12px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'all 0.2s ease'
            }} />
          </span>
        </button>
      </div>,
      <div key={`actions-${product.id}`}>
        {hasOptions ? (
          <Button
            size="slim"
            onClick={() => handleEditOptions(product.id)}
          >
            Edit
          </Button>
        ) : (
          <Button
            size="slim"
            onClick={() => handleAddOptions(product.id)}
          >
            Add
          </Button>
        )}
      </div>
    ];
  });

  const tabs = [
    {
      id: 'all',
      content: 'All',
      accessibilityLabel: 'All products',
      panelID: 'all-products-panel',
    },
  ];

  return (
    <Page
      title="Product Options"
      backAction={{ url: "/app" }}
    >
      <Layout>
        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => {}}>
              <p>{actionData.message}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <div style={{ padding: '16px' }}>
              <BlockStack gap="400">
                <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                  <div style={{ padding: '16px 0' }}>
                    <InlineStack gap="300" align="space-between">
                      <div style={{ flex: 1, maxWidth: '300px' }}>
                        <TextField
                          label="Search"
                          labelHidden
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search products..."
                          prefix={<SearchIcon />}
                          autoComplete="off"
                        />
                      </div>
                      <InlineStack gap="200">
                        <div style={{ minWidth: '150px' }}>
                          <Select
                            label="Status"
                            labelHidden
                            options={[
                              {label: 'All Status', value: ''},
                              {label: 'With Options', value: 'with-options'},
                              {label: 'Without Options', value: 'without-options'}
                            ]}
                            value={statusFilter.length > 0 ? statusFilter[0] : ''}
                            onChange={(value) => {
                              setStatusFilter(value ? [value] : []);
                              handleFilterChange();
                            }}
                            placeholder="Filter by status"
                          />
                        </div>
                        <div style={{ minWidth: '150px' }}>
                          <Select
                            label="Vendor"
                            labelHidden
                            options={[
                              {label: 'All Vendors', value: ''},
                              ...uniqueVendors.map(vendor => ({label: vendor, value: vendor}))
                            ]}
                            value={vendorFilter.length > 0 ? vendorFilter[0] : ''}
                            onChange={(value) => {
                              setVendorFilter(value ? [value] : []);
                              handleFilterChange();
                            }}
                            placeholder="Filter by vendor"
                          />
                        </div>
                      </InlineStack>
                    </InlineStack>
                  </div>
                </Tabs>

                {filteredProducts.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                      <Checkbox
                        label=""
                        checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.includes(p.id))}
                        onChange={handleSelectAll}
                      />
                      <Text variant="bodyMd" as="span">
                        Select all
                      </Text>
                    </div>
                    
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['', 'Product Title', 'Vendor', 'Tags', 'Has Options - Status', 'Action']}
                      rows={productRows}
                      hideScrollIndicator
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text variant="bodyMd" as="span">Show:</Text>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(e.target.value)}
                          style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="15">15</option>
                          <option value="20">20</option>
                        </select>
                      </div>
                      <Text variant="bodyMd" tone="subdued" as="span">
                        Showing {startIndex + 1} - {Math.min(endIndex, totalItems)} of {totalItems} results
                      </Text>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      {searchQuery ? 'No products found matching your search.' : 'No active products found in your store.'}
                    </Text>
                  </div>
                )}
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Product Customization Editor Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`🎨 Customize ${editingProduct?.title || 'Product'}`}
        size="large"
      >
        <Modal.Section>
          {editingProduct && (
            <Layout>
              {/* Left Panel - Controls */}
              <Layout.Section variant="oneThird">
                <BlockStack gap="400">
                  {/* Main View Settings */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">
                        📋 Main View
                      </Text>
                      
                      <div>
                        <Text variant="headingMd" as="h3">
                          Basic Settings
                        </Text>
                        <Box paddingBlockStart="200">
                          <BlockStack gap="300">
                            <TextField
                              label="View Name"
                              value={viewName}
                              onChange={setViewName}
                              placeholder="Main View"
                              autoComplete="off"
                            />
                            
                            <Select
                              label="View Background"
                              options={[
                                { label: 'Blank Canvas', value: 'blank' },
                                { label: `Product Image (${editingProduct?.title || 'Current Product'})`, value: 'product' },
                              ]}
                              value={viewBackground}
                              onChange={setViewBackground}
                            />
                            
                            <Text variant="bodyMd" as="p">Canvas Dimension</Text>
                            <InlineStack gap="200">
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="W"
                                  value={canvasWidth.toString()}
                                  onChange={(value) => setCanvasWidth(parseInt(value) || 1000)}
                                  suffix="px"
                                  type="number"
                                  autoComplete="off"
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="H"
                                  value={canvasHeight.toString()}
                                  onChange={(value) => setCanvasHeight(parseInt(value) || 1000)}
                                  suffix="px"
                                  type="number"
                                  autoComplete="off"
                                />
                              </div>
                            </InlineStack>
                          </BlockStack>
                        </Box>
                      </div>

                      {!isDesignStarted && (
                        <Button variant="primary" size="large" onClick={handleStartDesign}>
                          Start
                        </Button>
                      )}
                    </BlockStack>
                  </Card>

                  {/* Elements Panel */}
                  {isDesignStarted && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingMd" as="h2">
                          🎨 Elements
                        </Text>

                        <BlockStack gap="200">
                          <InlineStack gap="200" wrap={false}>
                            <Button size="slim" onClick={() => handleAddElement('singletext')}>
                              + Single Line Text
                            </Button>
                            <Button size="slim" onClick={() => handleAddElement('text')}>
                              + Multi Line Text
                            </Button>
                            <Button size="slim" onClick={() => handleAddElement('upload')}>
                              + Add Upload
                            </Button>
                          </InlineStack>
                          
                          {customizationElements.map((element, index) => (
                            <div
                              key={element.id}
                              style={{
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                backgroundColor: 'white'
                              }}
                            >
                              <BlockStack gap="300">
                                <InlineStack align="space-between">
                                  <InlineStack gap="200">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '16px' }}>
                                        {element.type === 'text' ? '📝' : element.type === 'singletext' ? '📄' : '📤'}
                                      </span>
                                      <div>
                                        <Text variant="bodyMd" fontWeight="semibold" as="span">
                                          {element.type === 'text' ? 'Multi Line Text' : element.type === 'singletext' ? 'Single Line Text' : 'Upload'}
                                        </Text>
                                        <br />
                                        <Text variant="bodySm" tone="subdued" as="span">
                                          {index + 1}
                                        </Text>
                                      </div>
                                    </div>
                                  </InlineStack>
                                  <InlineStack gap="100">
                                    <Button
                                      size="micro"
                                      variant="plain"
                                      tone="critical"
                                      onClick={() => handleDeleteElement(element.id)}
                                    >
                                      Delete
                                    </Button>
                                  </InlineStack>
                                </InlineStack>
                                
                                {/* Text input field for text elements */}
                                {(element.type === 'text' || element.type === 'singletext') && (
                                  <TextField
                                    label="Text Content"
                                    value={element.properties.text || ''}
                                    onChange={(value) => {
                                      setCustomizationElements(prev =>
                                        prev.map(el =>
                                          el.id === element.id
                                            ? { ...el, properties: { ...el.properties, text: value } }
                                            : el
                                        )
                                      );
                                    }}
                                    placeholder={element.type === 'singletext' ? 'Enter single line text...' : 'Enter your text here...'}
                                    autoComplete="off"
                                    multiline={element.type === 'text'}
                                  />
                                )}
                                
                                {/* Position Controls for all elements */}
                                <div>
                                  <Text variant="bodyMd" fontWeight="medium" as="p">Position</Text>
                                  <Box paddingBlockStart="200">
                                    <InlineStack gap="200">
                                      <div style={{ flex: 1 }}>
                                        <TextField
                                          label="X Position"
                                          value={element.x.toString()}
                                          onChange={(value) => {
                                            const newX = Math.max(0, Math.min(canvasWidth - element.width, parseInt(value) || 0));
                                            setCustomizationElements(prev =>
                                              prev.map(el =>
                                                el.id === element.id
                                                  ? { ...el, x: newX }
                                                  : el
                                              )
                                            );
                                          }}
                                          suffix="px"
                                          type="number"
                                          autoComplete="off"
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <TextField
                                          label="Y Position"
                                          value={element.y.toString()}
                                          onChange={(value) => {
                                            const newY = Math.max(0, Math.min(canvasHeight - element.height, parseInt(value) || 0));
                                            setCustomizationElements(prev =>
                                              prev.map(el =>
                                                el.id === element.id
                                                  ? { ...el, y: newY }
                                                  : el
                                              )
                                            );
                                          }}
                                          suffix="px"
                                          type="number"
                                          autoComplete="off"
                                        />
                                      </div>
                                    </InlineStack>
                                  </Box>
                                </div>
                                
                                {/* Size Controls for all elements */}
                                <div>
                                  <Text variant="bodyMd" fontWeight="medium" as="p">Size</Text>
                                  <Box paddingBlockStart="200">
                                    <InlineStack gap="200">
                                      <div style={{ flex: 1 }}>
                                        <TextField
                                          label="Width"
                                          value={element.width.toString()}
                                          onChange={(value) => {
                                            const newWidth = Math.max(50, Math.min(canvasWidth - element.x, parseInt(value) || 150));
                                            setCustomizationElements(prev =>
                                              prev.map(el =>
                                                el.id === element.id
                                                  ? { ...el, width: newWidth }
                                                  : el
                                              )
                                            );
                                          }}
                                          suffix="px"
                                          type="number"
                                          autoComplete="off"
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <TextField
                                          label="Height"
                                          value={element.height.toString()}
                                          onChange={(value) => {
                                            const newHeight = Math.max(20, Math.min(canvasHeight - element.y, parseInt(value) || 100));
                                            setCustomizationElements(prev =>
                                              prev.map(el =>
                                                el.id === element.id
                                                  ? { ...el, height: newHeight }
                                                  : el
                                              )
                                            );
                                          }}
                                          suffix="px"
                                          type="number"
                                          autoComplete="off"
                                        />
                                      </div>
                                    </InlineStack>
                                  </Box>
                                </div>
                              </BlockStack>
                            </div>
                          ))}
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  )}

                  {/* Cart and Order Settings */}
                  {isDesignStarted && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingMd" as="h2">
                          🛒 Cart and Order settings
                        </Text>
                        
                        <BlockStack gap="300">
                          <Checkbox
                            label="Save customer input as line item properties"
                            checked={saveAsLineItems}
                            onChange={setSaveAsLineItems}
                          />
                          
                          <TextField
                            label="Additional charge for customization"
                            value={additionalCharge}
                            onChange={setAdditionalCharge}
                            prefix="₹"
                            type="number"
                            autoComplete="off"
                          />
                          
                          <Checkbox
                            label="Enable live preview for customers"
                            checked={livePreview}
                            onChange={setLivePreview}
                          />
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  )}
                </BlockStack>
              </Layout.Section>

              {/* Right Panel - Canvas and Preview */}
              <Layout.Section>
                <BlockStack gap="400">
                  {/* Design Canvas */}
                  <Card>
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h2">
                          🎨 Design Canvas
                        </Text>
                        <InlineStack gap="200">
                          <Badge tone={livePreview ? 'success' : 'critical'}>
                            {`Live Preview ${livePreview ? 'ON' : 'OFF'}`}
                          </Badge>
                          <Select
                            label=""
                            labelHidden
                            options={[
                              { label: 'Active', value: 'active' },
                              { label: 'Inactive', value: 'inactive' },
                            ]}
                            value={templateStatus}
                            onChange={setTemplateStatus}
                          />
                        </InlineStack>
                      </InlineStack>

                      {!isDesignStarted ? (
                        <Box padding="600" background="bg-surface-secondary">
                          <BlockStack gap="300" align="center">
                            <div style={{ fontSize: '48px' }}>🎨</div>
                            <Text variant="headingMd" alignment="center" as="h3">
                              Ready to Design?
                            </Text>
                            <Text variant="bodyMd" tone="subdued" alignment="center" as="p">
                              Configure your canvas settings and click "Start" to begin designing.
                            </Text>
                            <Button variant="primary" size="large" onClick={handleStartDesign}>
                              Start Designing
                            </Button>
                          </BlockStack>
                        </Box>
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              maxWidth: '400px',
                              aspectRatio: '1',
                              border: '2px solid #ff6b35',
                              borderRadius: '8px',
                              backgroundColor: viewBackground === 'blank' ? '#f0f0f0' : 'transparent',
                              margin: '0 auto',
                              overflow: 'hidden',
                              backgroundImage: viewBackground === 'product' && editingProduct?.images.edges[0]
                                ? `url(${editingProduct.images.edges[0].node.url})`
                                : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }}
                          >
                            {/* Canvas Elements */}
                            {customizationElements.map((element) => (
                              <div
                                key={element.id}
                                style={{
                                  position: 'absolute',
                                  left: `${(element.x / canvasWidth) * 100}%`,
                                  top: `${(element.y / canvasHeight) * 100}%`,
                                  width: `${(element.width / canvasWidth) * 100}%`,
                                  height: `${(element.height / canvasHeight) * 100}%`,
                                  border: '1px dashed rgba(255,255,255,0.5)',
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  color: 'white',
                                  borderRadius: '4px',
                                  cursor: 'move'
                                }}
                              >
                                {(element.type === 'text' || element.type === 'singletext') && (
                                  <div style={{
                                    textAlign: 'center',
                                    color: element.properties.color || '#000000',
                                    fontSize: `${Math.max(8, (element.properties.fontSize || 18) * 0.4)}px`,
                                    fontFamily: element.properties.fontFamily || 'Arial',
                                    fontWeight: element.properties.bold ? 'bold' : 'normal',
                                    wordWrap: element.type === 'singletext' ? 'normal' : 'break-word',
                                    overflow: 'hidden',
                                    whiteSpace: element.type === 'singletext' ? 'nowrap' : 'normal',
                                    textOverflow: element.type === 'singletext' ? 'ellipsis' : 'clip'
                                  } as React.CSSProperties}>
                                    {element.properties.text || (element.type === 'singletext' ? 'Single Line Text' : 'Sample Text')}
                                  </div>
                                )}
                                {element.type === 'upload' && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', marginBottom: '2px' }}>📤</div>
                                    <div style={{ fontSize: '8px' }}>Logo Upload</div>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Canvas info */}
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '4px',
                                right: '4px',
                                background: 'rgba(0, 0, 0, 0.7)',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '8px',
                              }}
                            >
                              {canvasWidth} × {canvasHeight}px
                            </div>
                          </div>
                        </div>
                      )}
                    </BlockStack>
                  </Card>

                  {/* Live Preview Panel */}
                  {isDesignStarted && livePreview && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingMd" as="h2">
                          👤 Customer Preview
                        </Text>
                        
                        <Text variant="bodyMd" tone="subdued" as="p">
                          This is how customers will see the live preview when they customize the product.
                        </Text>
                        
                        <div style={{
                          padding: '20px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          backgroundColor: '#f9f9f9'
                        }}>
                          <Text variant="bodyMd" as="p">
                            ✅ Live preview is enabled - customers can see their changes in real-time
                          </Text>
                        </div>
                      </BlockStack>
                    </Card>
                  )}
                </BlockStack>
              </Layout.Section>
            </Layout>
          )}
        </Modal.Section>
        
        <Modal.Section>
          <InlineStack align="end" gap="200">
            <Button onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => {
              // Save template logic here
              const templateData = {
                elements: customizationElements,
                canvasWidth,
                canvasHeight,
                viewBackground,
                livePreview,
                additionalCharge: parseFloat(additionalCharge) || 0
              };
              
              setShowEditModal(false);
              const formData = new FormData();
              formData.append("action", "edit_options");
              formData.append("productId", editingProduct?.id || '');
              formData.append("templateData", JSON.stringify(templateData));
              submit(formData, { method: "post" });
            }}>
              Save Template
            </Button>
          </InlineStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}