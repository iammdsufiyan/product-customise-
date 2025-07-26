import { memo, useCallback, useState } from "react";
import {
  Modal,
  Layout,
  BlockStack,
  Card,
  Text,
  TextField,
  Select,
  Button,
  InlineStack,
  Badge,
  Box,
  Checkbox
} from "@shopify/polaris";

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

interface CustomizationModalProps {
  open: boolean;
  onClose: () => void;
  selectedProduct: any;
  customizationElements: CustomizationElement[];
  setCustomizationElements: (elements: CustomizationElement[]) => void;
  canvasWidth: number;
  setCanvasWidth: (width: number) => void;
  canvasHeight: number;
  setCanvasHeight: (height: number) => void;
  viewName: string;
  setViewName: (name: string) => void;
  isDesignStarted: boolean;
  setIsDesignStarted: (started: boolean) => void;
  livePreview: boolean;
  setLivePreview: (preview: boolean) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerLogo: string | null;
  setCustomerLogo: (logo: string | null) => void;
  onEditElement: (element: CustomizationElement) => void;
  onDeleteElement: (elementId: string) => void;
  onStartDesign: () => void;
}

export const CustomizationModal = memo(({
  open,
  onClose,
  selectedProduct,
  customizationElements,
  setCustomizationElements,
  canvasWidth,
  setCanvasWidth,
  canvasHeight,
  setCanvasHeight,
  viewName,
  setViewName,
  isDesignStarted,
  setIsDesignStarted,
  livePreview,
  setLivePreview,
  customerName,
  setCustomerName,
  customerLogo,
  setCustomerLogo,
  onEditElement,
  onDeleteElement,
  onStartDesign
}: CustomizationModalProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTemplate = useCallback(async () => {
    console.log('=== FRONTEND: Starting template save ===');
    
    if (!selectedProduct || !isDesignStarted) {
      console.log('FRONTEND: Validation failed', { selectedProduct: !!selectedProduct, isDesignStarted });
      alert('Please start designing before saving the template.');
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare template data
      const templateData = {
        viewName,
        canvasWidth,
        canvasHeight,
        elements: customizationElements,
        livePreview,
        productTitle: selectedProduct.title,
        productHandle: selectedProduct.handle,
        createdAt: new Date().toISOString()
      };

      console.log('FRONTEND: Template data prepared:', {
        viewName,
        canvasWidth,
        canvasHeight,
        elementsCount: customizationElements.length,
        livePreview,
        productId: selectedProduct.id,
        productTitle: selectedProduct.title
      });

      // Create form data
      const formData = new FormData();
      formData.append('productId', selectedProduct.id);
      formData.append('templateData', JSON.stringify(templateData));
      formData.append('templateName', viewName || 'Custom Template');

      console.log('FRONTEND: Sending request to /api/save-template');

      // Send to API
      const response = await fetch('/api/save-template', {
        method: 'POST',
        body: formData
      });

      console.log('FRONTEND: API Response status:', response.status);
      console.log('FRONTEND: API Response ok:', response.ok);

      const result = await response.json();
      console.log('FRONTEND: API Response data:', result);

      if (result.success) {
        console.log('FRONTEND: Template saved successfully');
        alert('Template saved successfully!');
        onClose();
      } else {
        console.log('FRONTEND: Template save failed:', result.error);
        alert(`Failed to save template: ${result.error}`);
      }
    } catch (error) {
      console.error('FRONTEND: Error saving template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
      console.log('=== FRONTEND: Template save process completed ===');
    }
  }, [selectedProduct, isDesignStarted, viewName, canvasWidth, canvasHeight, customizationElements, livePreview, onClose]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomerLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [setCustomerLogo]);

  if (!selectedProduct) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`🎨 Customize ${selectedProduct.title || 'Product'}`}
      size="large"
    >
      <Modal.Section>
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
                    <Button variant="primary" size="large" onClick={onStartDesign}>
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
                                onClick={() => onEditElement(element)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="micro"
                                variant="plain"
                                tone="critical"
                                onClick={() => onDeleteElement(element.id)}
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
                        <Button variant="primary" size="large" onClick={onStartDesign}>
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
                          onChange={handleFileUpload}
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
      </Modal.Section>
      
      <Modal.Section>
        <InlineStack align="end" gap="200">
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveTemplate}
            loading={isSaving}
            disabled={!isDesignStarted || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </InlineStack>
      </Modal.Section>
    </Modal>
  );
});

CustomizationModal.displayName = 'CustomizationModal';