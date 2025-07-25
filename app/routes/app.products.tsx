import { json, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  Page,
  Layout,
  Text,
  Button,
  DataTable,
  Select,
  TextField,
  BlockStack,
  InlineStack,
  Badge,
  Modal,
  Checkbox,
  RangeSlider,
  ColorPicker,
  Divider,
  Box
} from "@shopify/polaris";
import { useState, useCallback, useRef } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

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
      first: 50,
    },
  });

  const productsData = await productsResponse.json();
  const products = productsData.data?.products?.edges || [];

  // Mock templates data - will be replaced with actual database calls
  const templates = [
    { id: '1', name: 'Basic Text Personalization' },
    { id: '2', name: 'Advanced Canvas Design' },
    { id: '3', name: 'Color & Size Options' },
  ];

  return json({
    products,
    templates,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const productId = formData.get("productId") as string;
  const templateId = formData.get("templateId") as string;
  const action = formData.get("action") as string;

  if (action === "assign") {
    // Here you would save the assignment to your database
    console.log(`Assigning template ${templateId} to product ${productId}`);
    
    return json({ success: true, message: "Template assigned successfully!" });
  }

  if (action === "remove") {
    // Here you would remove the assignment from your database
    console.log(`Removing template assignment from product ${productId}`);
    
    return json({ success: true, message: "Template assignment removed!" });
  }

  return json({ success: false, message: "Invalid action" });
};

interface CustomizationElement {
  id: string;
  type: 'text' | 'image' | 'upload';
  x: number;
  y: number;
  width: number;
  height: number;
  properties: {
    placeholder?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    maxLength?: number;
    required?: boolean;
  };
}

export default function Products() {
  const { products, templates } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Customization modal state
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [customizationElements, setCustomizationElements] = useState<CustomizationElement[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(1000);
  const [canvasHeight, setCanvasHeight] = useState(1000);
  const [viewName, setViewName] = useState('Main View');
  const [isDesignStarted, setIsDesignStarted] = useState(false);
  const [livePreview, setLivePreview] = useState(true);
  
  // Element editing state
  const [showElementEditModal, setShowElementEditModal] = useState(false);
  const [editingElement, setEditingElement] = useState<CustomizationElement | null>(null);
  
  // Customer preview state
  const [customerName, setCustomerName] = useState('');
  const [customerLogo, setCustomerLogo] = useState<string | null>(null);

  const filteredProducts = products.filter((product: any) =>
    product.node.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCustomization = useCallback((product: any) => {
    console.log('handleOpenCustomization called with product:', product);
    setSelectedProduct(product);
    setShowCustomizationModal(true);
    setIsDesignStarted(false);
    setCustomizationElements([]);
    setViewName('Main View');
    setCustomerName('');
    setCustomerLogo(null);
    console.log('Customization modal should be opening now');
  }, []);

  const handleStartDesign = useCallback(() => {
    setIsDesignStarted(true);
    // Add default text element for name
    const nameElement: CustomizationElement = {
      id: 'name_field',
      type: 'text',
      x: 400,
      y: 450,
      width: 200,
      height: 50,
      properties: {
        placeholder: 'Enter your name...',
        fontSize: 24,
        fontFamily: 'Impact',
        color: '#FFFFFF',
        bold: true,
        maxLength: 30,
        required: false
      }
    };
    
    // Add default logo upload element
    const logoElement: CustomizationElement = {
      id: 'logo_upload',
      type: 'upload',
      x: 425,
      y: 800,
      width: 150,
      height: 100,
      properties: {
        maxLength: 5
      }
    };
    
    setCustomizationElements([nameElement, logoElement]);
  }, []);

  const handleEditElement = useCallback((element: CustomizationElement) => {
    console.log('handleEditElement called with:', element);
    setEditingElement(element);
    setShowElementEditModal(true);
    console.log('Modal should be opening now');
  }, []);

  const handleSaveElement = useCallback(() => {
    if (editingElement) {
      setCustomizationElements(prev =>
        prev.map(el => el.id === editingElement.id ? editingElement : el)
      );
      setShowElementEditModal(false);
      setEditingElement(null);
    }
  }, [editingElement]);

  const handleDeleteElement = useCallback((elementId: string) => {
    setCustomizationElements(prev => prev.filter(el => el.id !== elementId));
  }, []);

  const handleAssignTemplate = (productId: string) => {
    if (!selectedTemplate) {
      alert("Please select a template first");
      return;
    }

    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("templateId", selectedTemplate);
    formData.append("action", "assign");
    
    submit(formData, { method: "post" });
  };

  const handleRemoveTemplate = (productId: string) => {
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("action", "remove");
    
    submit(formData, { method: "post" });
  };

  const productRows = filteredProducts.map((product: any) => [
    <div key={product.node.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {product.node.images.edges[0] && (
        <img
          src={product.node.images.edges[0].node.url}
          alt={product.node.images.edges[0].node.altText || product.node.title}
          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
        />
      )}
      <div>
        <button
          onClick={() => handleOpenCustomization(product.node)}
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
        onClick={() => handleOpenCustomization(product.node)}
      >
        Add
      </Button>
      <Button
        size="slim"
        variant="secondary"
        onClick={() => handleOpenCustomization(product.node)}
      >
        Edit
      </Button>
      <Button
        size="slim"
        onClick={() => handleAssignTemplate(product.node.id)}
        disabled={!selectedTemplate}
      >
        Assign
      </Button>
      <Button
        size="slim"
        variant="plain"
        tone="critical"
        onClick={() => handleRemoveTemplate(product.node.id)}
      >
        Remove
      </Button>
    </InlineStack>,
  ]);

  const templateOptions = [
    { label: 'Select a template...', value: '' },
    ...templates.map((template: any) => ({
      label: template.name,
      value: template.id,
    })),
  ];

  return (
    <Page
      title="Product Assignment"
      subtitle="Assign personalization templates to your products"
      backAction={{ url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Template Assignment
              </Text>
              
              <InlineStack gap="400" align="start">
                <div style={{ minWidth: '300px' }}>
                  <Select
                    label="Select Template"
                    options={templateOptions}
                    value={selectedTemplate}
                    onChange={setSelectedTemplate}
                  />
                </div>
                <div style={{ minWidth: '300px' }}>
                  <TextField
                    label="Search Products"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by product name..."
                    autoComplete="off"
                  />
                </div>
              </InlineStack>

              {selectedTemplate && (
                <div style={{ padding: '12px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="bodyMd" as="p">
                    Selected template: <strong>{templates.find((t: any) => t.id === selectedTemplate)?.name}</strong>
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Click "Assign" next to any product to apply this template.
                  </Text>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Products ({filteredProducts.length})
              </Text>
              
              {filteredProducts.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
                  headings={['Product', 'Status', 'Inventory', 'Current Template', 'Actions']}
                  rows={productRows}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    {searchQuery ? 'No products found matching your search.' : 'No products found.'}
                  </Text>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Customization Modal */}
      <Modal
        open={showCustomizationModal}
        onClose={() => setShowCustomizationModal(false)}
        title={`🎨 Customize ${selectedProduct?.title || 'Product'}`}
        size="large"
      >
        <Modal.Section>
          {selectedProduct && (
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
                                { label: 'Orange Snowboard Background', value: 'snowboard' },
                              ]}
                              value="snowboard"
                              onChange={() => {}}
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
                              <InlineStack align="space-between">
                                <InlineStack gap="200">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '16px' }}>
                                      {element.type === 'text' ? '📝' : '📤'}
                                    </span>
                                    <div>
                                      <Text variant="bodyMd" fontWeight="semibold" as="span">
                                        {element.type === 'text' ? 'Multi Line Text' : 'Upload'}
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
                                    variant="primary"
                                    onClick={() => handleEditElement(element)}
                                  >
                                    Edit
                                  </Button>
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
                            checked={true}
                            onChange={() => {}}
                          />
                          
                          <TextField
                            label="Additional charge for customization"
                            value="0"
                            onChange={() => {}}
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

              {/* Right Panel - Canvas and Customer Preview */}
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
                          <Badge tone="info">
                            Active
                          </Badge>
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
                              backgroundColor: '#ff6b35',
                              margin: '0 auto',
                              overflow: 'hidden',
                              backgroundImage: 'linear-gradient(135deg, #ff6b35 0%, #ff8e3c 100%)',
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
                                }}
                              >
                                {element.type === 'text' && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', marginBottom: '2px' }}>📝</div>
                                    <div style={{ fontSize: '8px' }}>Text Field</div>
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

                            {/* Live Preview Overlay */}
                            {livePreview && (
                              <>
                                {/* Customer Name Display */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '45%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                    fontFamily: 'Impact, Arial, sans-serif',
                                  }}
                                >
                                  {customerName || 'Your Name Here'}
                                </div>

                                {/* Customer Logo Display */}
                                {customerLogo && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      bottom: '10%',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                    }}
                                  >
                                    <img
                                      src={customerLogo}
                                      alt="Customer logo"
                                      style={{
                                        maxWidth: '60px',
                                        maxHeight: '40px',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                      }}
                                    />
                                  </div>
                                )}
                              </>
                            )}

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

                  {/* Customer Preview Panel */}
                  {isDesignStarted && livePreview && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingMd" as="h2">
                          👤 Customer Preview
                        </Text>
                        
                        <InlineStack gap="400">
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Customer Name (Live Preview)"
                              value={customerName}
                              onChange={setCustomerName}
                              placeholder="Enter name to see live preview..."
                              autoComplete="off"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    setCustomerLogo(e.target?.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              style={{
                                padding: '8px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                width: '100%'
                              }}
                            />
                            <Text variant="bodySm" tone="subdued" as="p">
                              Upload logo for live preview
                            </Text>
                          </div>
                        </InlineStack>
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
            <Button onClick={() => setShowCustomizationModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => {
              // Save template logic here
              setShowCustomizationModal(false);
              alert('Template saved successfully!');
            }}>
              Save Template
            </Button>
          </InlineStack>
        </Modal.Section>
      </Modal>

      {/* Element Edit Modal */}
      <Modal
        open={showElementEditModal}
        onClose={() => setShowElementEditModal(false)}
        title={`Edit ${editingElement?.type === 'text' ? 'Text' : 'Upload'} Element`}
        size="large"
      >
        <Modal.Section>
          {editingElement && (
            <BlockStack gap="400">
              {/* Position Settings */}
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">Position & Size</Text>
                  <InlineStack gap="200">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="X Position"
                        value={editingElement.x.toString()}
                        onChange={(value) => setEditingElement({
                          ...editingElement,
                          x: parseInt(value) || 0
                        })}
                        suffix="px"
                        type="number"
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Y Position"
                        value={editingElement.y.toString()}
                        onChange={(value) => setEditingElement({
                          ...editingElement,
                          y: parseInt(value) || 0
                        })}
                        suffix="px"
                        type="number"
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>
                  <InlineStack gap="200">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Width"
                        value={editingElement.width.toString()}
                        onChange={(value) => setEditingElement({
                          ...editingElement,
                          width: parseInt(value) || 100
                        })}
                        suffix="px"
                        type="number"
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Height"
                        value={editingElement.height.toString()}
                        onChange={(value) => setEditingElement({
                          ...editingElement,
                          height: parseInt(value) || 50
                        })}
                        suffix="px"
                        type="number"
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* Text-specific properties */}
              {editingElement.type === 'text' && (
                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">Text Properties</Text>
                    <TextField
                      label="Placeholder Text"
                      value={editingElement.properties.placeholder || ''}
                      onChange={(value) => setEditingElement({
                        ...editingElement,
                        properties: {
                          ...editingElement.properties,
                          placeholder: value
                        }
                      })}
                      autoComplete="off"
                    />
                    <InlineStack gap="200">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Font Size"
                          value={editingElement.properties.fontSize?.toString() || '16'}
                          onChange={(value) => setEditingElement({
                            ...editingElement,
                            properties: {
                              ...editingElement.properties,
                              fontSize: parseInt(value) || 16
                            }
                          })}
                          suffix="px"
                          type="number"
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Select
                          label="Font Family"
                          options={[
                            { label: 'Arial', value: 'Arial' },
                            { label: 'Impact', value: 'Impact' },
                            { label: 'Times New Roman', value: 'Times New Roman' },
                            { label: 'Helvetica', value: 'Helvetica' },
                          ]}
                          value={editingElement.properties.fontFamily || 'Arial'}
                          onChange={(value) => setEditingElement({
                            ...editingElement,
                            properties: {
                              ...editingElement.properties,
                              fontFamily: value
                            }
                          })}
                        />
                      </div>
                    </InlineStack>
                    <div style={{ maxWidth: '200px' }}>
                      <ColorPicker
                        color={{ hue: 0, saturation: 0, brightness: 1 }}
                        onChange={() => {}}
                      />
                      <Text variant="bodySm" as="p">Text Color</Text>
                    </div>
                    <InlineStack gap="300">
                      <Checkbox
                        label="Bold"
                        checked={editingElement.properties.bold || false}
                        onChange={(checked) => setEditingElement({
                          ...editingElement,
                          properties: {
                            ...editingElement.properties,
                            bold: checked
                          }
                        })}
                      />
                      <Checkbox
                        label="Italic"
                        checked={editingElement.properties.italic || false}
                        onChange={(checked) => setEditingElement({
                          ...editingElement,
                          properties: {
                            ...editingElement.properties,
                            italic: checked
                          }
                        })}
                      />
                      <Checkbox
                        label="Required"
                        checked={editingElement.properties.required || false}
                        onChange={(checked) => setEditingElement({
                          ...editingElement,
                          properties: {
                            ...editingElement.properties,
                            required: checked
                          }
                        })}
                      />
                    </InlineStack>
                    <TextField
                      label="Max Length"
                      value={editingElement.properties.maxLength?.toString() || ''}
                      onChange={(value) => setEditingElement({
                        ...editingElement,
                        properties: {
                          ...editingElement.properties,
                          maxLength: parseInt(value) || undefined
                        }
                      })}
                      type="number"
                      autoComplete="off"
                    />
                  </BlockStack>
                </Card>
              )}

              {/* Upload-specific properties */}
              {editingElement.type === 'upload' && (
                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">Upload Properties</Text>
                    <TextField
                      label="Max File Size (MB)"
                      value={editingElement.properties.maxLength?.toString() || '5'}
                      onChange={(value) => setEditingElement({
                        ...editingElement,
                        properties: {
                          ...editingElement.properties,
                          maxLength: parseInt(value) || 5
                        }
                      })}
                      type="number"
                      autoComplete="off"
                    />
                    <Checkbox
                      label="Required"
                      checked={editingElement.properties.required || false}
                      onChange={(checked) => setEditingElement({
                        ...editingElement,
                        properties: {
                          ...editingElement.properties,
                          required: checked
                        }
                      })}
                    />
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          )}
        </Modal.Section>
        
        <Modal.Section>
          <InlineStack align="end" gap="200">
            <Button onClick={() => setShowElementEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveElement}>
              Save Changes
            </Button>
          </InlineStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}