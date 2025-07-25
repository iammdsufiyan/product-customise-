import { json, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { 
  Card, 
  Page, 
  Layout, 
  Text, 
  Button, 
  Select, 
  TextField,
  BlockStack,
  InlineStack,
  Badge,
  Modal,
  Checkbox,
  ColorPicker,
  RangeSlider,
  Divider,
  Box,
  Icon
} from "@shopify/polaris";
import { useState, useCallback, useRef, useEffect } from "react";
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon } from "@shopify/polaris-icons";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const productId = params.productId;

  // Fetch product details
  const productResponse = await admin.graphql(`
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        status
        images(first: 5) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
      }
    }
  `, {
    variables: {
      id: `gid://shopify/Product/${productId}`,
    },
  });

  const productData = await productResponse.json();
  const product = productData.data?.product;

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  // Mock template data - will be replaced with database calls
  const template = {
    id: '1',
    name: 'Main View',
    canvasWidth: 1000,
    canvasHeight: 1000,
    backgroundImage: null,
    elements: [],
    isActive: false,
    livePreview: true
  };

  return json({
    product,
    template,
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (action === "save_template") {
    const templateData = JSON.parse(formData.get("templateData") as string);
    // Save template to database
    console.log("Saving template:", templateData);
    return json({ success: true, message: "Template saved successfully!" });
  }

  if (action === "activate_template") {
    // Activate template
    console.log("Activating template for product:", params.productId);
    return json({ success: true, message: "Template activated successfully!" });
  }

  return json({ success: false, message: "Invalid action" });
};

interface Element {
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
    underline?: boolean;
    maxLength?: number;
    required?: boolean;
    allowedTypes?: string[];
    maxSize?: number;
  };
}

export default function ProductEditor() {
  const { product, template: initialTemplate } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();

  // Template state
  const [template, setTemplate] = useState(initialTemplate);
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [livePreview, setLivePreview] = useState(true);

  // Modal states
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [showElementPropertiesModal, setShowElementPropertiesModal] = useState(false);
  const [newElementType, setNewElementType] = useState<'text' | 'image' | 'upload'>('text');

  // Canvas state
  const [canvasWidth, setCanvasWidth] = useState(1000);
  const [canvasHeight, setCanvasHeight] = useState(1000);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [viewName, setViewName] = useState('Main View');

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleStart = useCallback(() => {
    setIsStarted(true);
  }, []);

  const handleAddElement = useCallback((type: 'text' | 'image' | 'upload') => {
    const newElement: Element = {
      id: `element_${Date.now()}`,
      type,
      x: 100,
      y: 100,
      width: type === 'text' ? 200 : 150,
      height: type === 'text' ? 50 : 150,
      properties: {
        placeholder: type === 'text' ? 'Enter text here...' : undefined,
        fontSize: 18,
        fontFamily: 'Arial',
        color: '#000000',
        bold: false,
        italic: false,
        underline: false,
        maxLength: type === 'text' ? 50 : undefined,
        required: false,
        allowedTypes: type === 'upload' ? ['image/jpeg', 'image/png', 'image/gif'] : undefined,
        maxSize: type === 'upload' ? 5 : undefined,
      }
    };

    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
    setShowAddElementModal(false);
  }, []);

  const handleElementClick = useCallback((elementId: string) => {
    setSelectedElement(elementId);
    setShowElementPropertiesModal(true);
  }, []);

  const handleDeleteElement = useCallback((elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    setSelectedElement(null);
  }, []);

  const handleSaveTemplate = useCallback(() => {
    const templateData = {
      name: viewName,
      canvasWidth,
      canvasHeight,
      backgroundImage,
      elements,
      livePreview,
      productId: product.id
    };

    const formData = new FormData();
    formData.append("action", "save_template");
    formData.append("templateData", JSON.stringify(templateData));
    
    submit(formData, { method: "post" });
  }, [viewName, canvasWidth, canvasHeight, backgroundImage, elements, livePreview, product.id, submit]);

  const handleActivateTemplate = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "activate_template");
    
    submit(formData, { method: "post" });
  }, [submit]);

  const selectedElementData = selectedElement ? elements.find(el => el.id === selectedElement) : null;

  return (
    <Page
      title={`Customize ${product.title}`}
      subtitle="Design your product personalization template"
      backAction={{ 
        url: "/app/products",
        content: "Back to Products"
      }}
      primaryAction={{
        content: "Save",
        onAction: handleSaveTemplate,
      }}
      secondaryActions={[
        {
          content: template.isActive ? "Active" : "Activate",
          onAction: handleActivateTemplate,
          disabled: template.isActive,
        }
      ]}
    >
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
                      />
                      
                      <Select
                        label="View Background"
                        options={[
                          { label: 'Blank Canvas', value: 'blank' },
                          { label: 'Upload Product Image', value: 'upload' },
                          { label: 'Use Product Photo', value: 'product' },
                        ]}
                        value="blank"
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
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="H"
                            value={canvasHeight.toString()}
                            onChange={(value) => setCanvasHeight(parseInt(value) || 1000)}
                            suffix="px"
                            type="number"
                          />
                        </div>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </div>

                {!isStarted && (
                  <Button variant="primary" size="large" onClick={handleStart}>
                    Start
                  </Button>
                )}
              </BlockStack>
            </Card>

            {/* Elements Panel */}
            {isStarted && (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      🎨 Elements
                    </Text>
                    <Button 
                      icon={PlusIcon}
                      onClick={() => setShowAddElementModal(true)}
                    >
                      Add Element
                    </Button>
                  </InlineStack>

                  {elements.length === 0 ? (
                    <Box padding="400" background="bg-surface-secondary">
                      <Text variant="bodyMd" tone="subdued" alignment="center" as="p">
                        No elements added yet. Click "Add Element" to start designing.
                      </Text>
                    </Box>
                  ) : (
                    <BlockStack gap="200">
                      {elements.map((element, index) => (
                        <div
                          key={element.id}
                          style={{
                            padding: '12px',
                            border: selectedElement === element.id ? '2px solid #007bff' : '1px solid #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: selectedElement === element.id ? '#f8f9ff' : 'white'
                          }}
                          onClick={() => handleElementClick(element.id)}
                        >
                          <InlineStack align="space-between">
                            <InlineStack gap="200">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>
                                  {element.type === 'text' ? '📝' : element.type === 'image' ? '🖼️' : '📤'}
                                </span>
                                <div>
                                  <Text variant="bodyMd" fontWeight="semibold" as="span">
                                    {element.type === 'text' ? 'Multi Line Text' : 
                                     element.type === 'image' ? 'Image Choices' : 'Upload'}
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
                                icon={EditIcon}
                                size="slim"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedElement(element.id);
                                  setShowElementPropertiesModal(true);
                                }}
                              />
                              <Button
                                icon={DeleteIcon}
                                size="slim"
                                variant="plain"
                                tone="critical"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteElement(element.id);
                                }}
                              />
                            </InlineStack>
                          </InlineStack>
                        </div>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            )}

            {/* Cart and Order Settings */}
            {isStarted && (
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

        {/* Right Panel - Canvas */}
        <Layout.Section variant="twoThirds">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">
                  🎨 Design Canvas
                </Text>
                <InlineStack gap="200">
                  <Badge tone={livePreview ? 'success' : 'critical'}>
                    Live Preview {livePreview ? 'ON' : 'OFF'}
                  </Badge>
                  <Badge tone={template.isActive ? 'success' : 'info'}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </InlineStack>
              </InlineStack>

              {!isStarted ? (
                <Box padding="600" background="bg-surface-secondary">
                  <BlockStack gap="300" align="center">
                    <div style={{ fontSize: '48px' }}>🎨</div>
                    <Text variant="headingMd" alignment="center" as="h3">
                      Ready to Design?
                    </Text>
                    <Text variant="bodyMd" tone="subdued" alignment="center" as="p">
                      Configure your canvas settings on the left and click "Start" to begin designing your product customization template.
                    </Text>
                    <Button variant="primary" size="large" onClick={handleStart}>
                      Start Designing
                    </Button>
                  </BlockStack>
                </Box>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div
                    ref={canvasRef}
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '600px',
                      aspectRatio: `${canvasWidth}/${canvasHeight}`,
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9',
                      margin: '0 auto',
                      overflow: 'hidden',
                      backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Grid overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `
                          linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px',
                        pointerEvents: 'none',
                        opacity: 0.3,
                      }}
                    />

                    {/* Elements */}
                    {elements.map((element) => (
                      <div
                        key={element.id}
                        style={{
                          position: 'absolute',
                          left: `${(element.x / canvasWidth) * 100}%`,
                          top: `${(element.y / canvasHeight) * 100}%`,
                          width: `${(element.width / canvasWidth) * 100}%`,
                          height: `${(element.height / canvasHeight) * 100}%`,
                          border: selectedElement === element.id ? '2px solid #007bff' : '1px dashed #999',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: '#666',
                          borderRadius: '4px',
                        }}
                        onClick={() => handleElementClick(element.id)}
                      >
                        {element.type === 'text' && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', marginBottom: '4px' }}>📝</div>
                            <div>Text Field</div>
                            <div style={{ fontSize: '10px', opacity: 0.7 }}>
                              {element.properties.placeholder}
                            </div>
                          </div>
                        )}
                        {element.type === 'image' && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', marginBottom: '4px' }}>🖼️</div>
                            <div>Image Choice</div>
                          </div>
                        )}
                        {element.type === 'upload' && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', marginBottom: '4px' }}>📤</div>
                            <div>Upload Field</div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Canvas info */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                      }}
                    >
                      {canvasWidth} × {canvasHeight}px
                    </div>
                  </div>

                  <Box paddingBlockStart="400">
                    <Text variant="bodySm" tone="subdued" alignment="center" as="p">
                      Click elements to edit their properties. Drag to reposition (coming soon).
                    </Text>
                  </Box>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Add Element Modal */}
      <Modal
        open={showAddElementModal}
        onClose={() => setShowAddElementModal(false)}
        title="Add New Element"
        primaryAction={{
          content: 'Add Element',
          onAction: () => handleAddElement(newElementType),
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowAddElementModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd" as="p">
              Choose the type of element you want to add to your canvas:
            </Text>
            
            <Select
              label="Element Type"
              options={[
                { label: '📝 Text Field (for names, messages)', value: 'text' },
                { label: '🖼️ Image Choices (predefined options)', value: 'image' },
                { label: '📤 Upload Field (customer uploads)', value: 'upload' },
              ]}
              value={newElementType}
              onChange={(value) => setNewElementType(value as 'text' | 'image' | 'upload')}
            />

            <Box padding="300" background="bg-surface-secondary">
              <Text variant="bodySm" tone="subdued" as="p">
                {newElementType === 'text' && "Perfect for names, custom messages, or any text input from customers."}
                {newElementType === 'image' && "Let customers choose from predefined image options you provide."}
                {newElementType === 'upload' && "Allow customers to upload their own images (logos, photos, etc.)."}
              </Text>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Element Properties Modal */}
      <Modal
        open={showElementPropertiesModal}
        onClose={() => setShowElementPropertiesModal(false)}
        title={`Edit ${selectedElementData?.type === 'text' ? 'Text' : selectedElementData?.type === 'image' ? 'Image' : 'Upload'} Element`}
        primaryAction={{
          content: 'Save Changes',
          onAction: () => setShowElementPropertiesModal(false),
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowElementPropertiesModal(false),
          },
        ]}
      >
        <Modal.Section>
          {selectedElementData && (
            <BlockStack gap="400">
              {selectedElementData.type === 'text' && (
                <>
                  <TextField
                    label="Placeholder Text"
                    value={selectedElementData.properties.placeholder || ''}
                    onChange={(value) => {
                      setElements(prev => prev.map(el => 
                        el.id === selectedElement 
                          ? { ...el, properties: { ...el.properties, placeholder: value } }
                          : el
                      ));
                    }}
                  />
                  
                  <TextField
                    label="Maximum Characters"
                    type="number"
                    value={selectedElementData.properties.maxLength?.toString() || '50'}
                    onChange={(value) => {
                      setElements(prev => prev.map(el => 
                        el.id === selectedElement 
                          ? { ...el, properties: { ...el.properties, maxLength: parseInt(value) || 50 } }
                          : el
                      ));
                    }}
                  />
                  
                  <Select
                    label="Font Family"
                    options={[
                      { label: 'Arial', value: 'Arial' },
                      { label: 'Helvetica', value: 'Helvetica' },
                      { label: 'Impact', value: 'Impact' },
                      { label: 'Georgia', value: 'Georgia' },
                      { label: 'Times New Roman', value: 'Times New Roman' },
                    ]}
                    value={selectedElementData.properties.fontFamily || 'Arial'}
                    onChange={(value) => {
                      setElements(prev => prev.map(el => 
                        el.id === selectedElement 
                          ? { ...el, properties: { ...el.properties, fontFamily: value } }
                          : el
                      ));
                    }}
                  />
                  
                  <RangeSlider
                    label="Font Size"
                    value={selectedElementData.properties.fontSize || 18}
                    min={12}
                    max={48}
                    onChange={(value) => {
                      setElements(prev => prev.map(el => 
                        el.id === selectedElement 
                          ? { ...el, properties: { ...el.properties, fontSize: value } }
                          : el
                      ));
                    }}
                    output
                  />
                  
                  <InlineStack gap="300">
                    <Checkbox
                      label="Bold"
                      checked={selectedElementData.properties.bold || false}
                      onChange={(checked) => {
                        setElements(prev => prev.map(el => 
                          el.id === selectedElement 
                            ? { ...el, properties: { ...el.properties, bold: checked } }
                            : el
                        ));
                      }}
                    />
                    <Checkbox
                      label="Italic"
                      checked={selectedElementData.properties.italic || false}
                      onChange={(checked) => {
                        setElements(prev => prev.map(el => 
                          el.id === selectedElement 
                            ? { ...el, properties: { ...el.properties, italic: checked } }
                            : el
                        ));
                      }}
                    />
                    <Checkbox
                      label="Required"
                      checked={selectedElementData.properties.required || false}
                      onChange={(checked) => {
                        setElements(prev => prev.map(el => 
                          el.id === selectedElement 
                            ? { ...el, properties: { ...el.properties, required: checked } }
                            : el
                        ));
                      }}
                    />
                  </InlineStack>
                </>
              )}
              
              {selectedElementData.type === 'upload' && (
                <>
                  <Select
                    label="Allowed File Types"
                    options={[
                      { label: 'Images only (JPG, PNG, GIF)', value: 'images' },
                      { label: 'All image formats', value: 'all_images' },
                      { label: 'Custom selection', value: 'custom' },
                    ]}
                    value="images"
                    onChange={() => {}}
                  />
                  
                  <TextField
                    label="Maximum File Size (MB)"
                    type="number"
                    value={selectedElementData.properties.maxSize?.toString() || '5'}
                    onChange={(value) => {
                      setElements(prev => prev.map(el => 
                        el.id === selectedElement 
                          ? { ...el, properties: { ...el.properties, maxSize: parseInt(value) || 5 } }
                          : el
                      ));
                    }}
                  />
                  
                  <Checkbox
                    label="Required field"
                    checked={selectedElementData.properties.required || false}
                    onChange={(checked) => {
                      setElements(prev => prev.map(el => 
                        el.id === selectedElement 
                          ? { ...el, properties: { ...el.properties, required: checked } }
                          : el
                      ));
                    }}
                  />
                </>
              )}

              <Divider />
              
              <Text variant="headingMd" as="h3">Position & Size</Text>
              <InlineStack gap="200">
                <TextField
                  label="X Position"
                  type="number"
                  value={selectedElementData.x.toString()}
                  onChange={(value) => {
                    setElements(prev => prev.map(el => 
                      el.id === selectedElement 
                        ? { ...el, x: parseInt(value) || 0 }
                        : el
                    ));
                  }}
                  suffix="px"
                />
                <TextField
                  label="Y Position"
                  type="number"
                  value={selectedElementData.y.toString()}
                  onChange={(value) => {
                    setElements(prev => prev.map(el => 
                      el.id === selectedElement 
                        ? { ...el, y: parseInt(value) || 0 }
                        : el
                    ));
                  }}
                  suffix="px"
                />
              </InlineStack>
              
              <InlineStack gap="200">
                <TextField
                  label="Width"
                  type="number"
                  value={selectedElementData.width.toString()}
                  onChange={(value) => {
                    setElements(prev => prev.map(el => 
                      el.id === selectedElement 
                        ? { ...el, width: parseInt(value) || 100 }
                        : el
                    ));
                  }}
                  suffix="px"
                />
                <TextField
                  label="Height"
                  type="number"
                  value={selectedElementData.height.toString()}
                  onChange={(value) => {
                    setElements(prev => prev.map(el => 
                      el.id === selectedElement 
                        ? { ...el, height: parseInt(value) || 100 }
                        : el
                    ));
                  }}
                  suffix="px"
                />
              </InlineStack>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}