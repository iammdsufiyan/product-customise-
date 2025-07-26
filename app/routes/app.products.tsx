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
import { useState, useCallback, useRef, useMemo } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { CustomizationModal } from "../components/CustomizationModal";
import { ElementEditModal } from "../components/ElementEditModal";
import { VirtualizedProductList } from "../components/VirtualizedProductList";

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
  
  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
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

  // Memoized filtered products using debounced search
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return products;
    }
    return products.filter((product: any) =>
      product.node.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      product.node.handle.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [products, debouncedSearchQuery]);

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

  const handleAssignTemplate = useCallback((productId: string) => {
    if (!selectedTemplate) {
      alert("Please select a template first");
      return;
    }

    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("templateId", selectedTemplate);
    formData.append("action", "assign");
    
    submit(formData, { method: "post" });
  }, [selectedTemplate, submit]);

  const handleRemoveTemplate = useCallback((productId: string) => {
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("action", "remove");
    
    submit(formData, { method: "post" });
  }, [submit]);

  // Removed productRows - now handled by VirtualizedProductList

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
          <VirtualizedProductList
            products={filteredProducts}
            selectedTemplate={selectedTemplate}
            onOpenCustomization={handleOpenCustomization}
            onAssignTemplate={handleAssignTemplate}
            onRemoveTemplate={handleRemoveTemplate}
          />
        </Layout.Section>
      </Layout>

      {/* Customization Modal */}
      <CustomizationModal
        open={showCustomizationModal}
        onClose={() => setShowCustomizationModal(false)}
        selectedProduct={selectedProduct}
        customizationElements={customizationElements}
        setCustomizationElements={setCustomizationElements}
        canvasWidth={canvasWidth}
        setCanvasWidth={setCanvasWidth}
        canvasHeight={canvasHeight}
        setCanvasHeight={setCanvasHeight}
        viewName={viewName}
        setViewName={setViewName}
        isDesignStarted={isDesignStarted}
        setIsDesignStarted={setIsDesignStarted}
        livePreview={livePreview}
        setLivePreview={setLivePreview}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerLogo={customerLogo}
        setCustomerLogo={setCustomerLogo}
        onEditElement={handleEditElement}
        onDeleteElement={handleDeleteElement}
        onStartDesign={handleStartDesign}
      />

      {/* Element Edit Modal */}
      <ElementEditModal
        open={showElementEditModal}
        onClose={() => setShowElementEditModal(false)}
        editingElement={editingElement}
        setEditingElement={setEditingElement}
        onSave={handleSaveElement}
      />
    </Page>
  );
}