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
  Modal,
  Box
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { SearchIcon, EditIcon, DeleteIcon } from "@shopify/polaris-icons";

interface Template {
  id: string;
  name: string;
  description: string | null;
  productId: string;
  productTitle: string | null;
  productHandle: string | null;
  templateData: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Fetch all templates with their associated products
    const templates = await db.productOptionSet.findMany({
      where: {
        isActive: true
      },
      include: {
        optionSet: {
          select: {
            id: true,
            name: true,
            description: true,
            fields: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform the data to match our Template interface
    const transformedTemplates = templates.map(template => ({
      id: template.optionSet.id,
      name: template.optionSet.name,
      description: template.optionSet.description,
      productId: template.productId,
      productTitle: template.productTitle,
      productHandle: template.productHandle,
      templateData: template.optionSet.fields,
      isActive: template.optionSet.isActive,
      createdAt: template.optionSet.createdAt,
      updatedAt: template.optionSet.updatedAt
    }));

    return json({ templates: transformedTemplates });
  } catch (error) {
    console.error('Error loading templates:', error);
    return json({ templates: [] });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const templateId = formData.get("templateId") as string;

  try {
    if (action === "delete_template") {
      console.log(`Deleting template: ${templateId}`);
      
      // Deactivate the template instead of deleting it
      await db.optionSet.update({
        where: { id: templateId },
        data: { isActive: false }
      });

      // Also deactivate the product-option set relationship
      await db.productOptionSet.updateMany({
        where: { optionSetId: templateId },
        data: { isActive: false }
      });
      
      return json({
        success: true,
        message: "Template deleted successfully!"
      });
    }

    if (action === "toggle_template") {
      console.log(`Toggling template: ${templateId}`);
      
      // Find the current status
      const template = await db.optionSet.findUnique({
        where: { id: templateId }
      });

      if (template) {
        const newStatus = !template.isActive;
        
        // Update template status
        await db.optionSet.update({
          where: { id: templateId },
          data: { isActive: newStatus }
        });

        // Update product-option set relationship status
        await db.productOptionSet.updateMany({
          where: { optionSetId: templateId },
          data: { isActive: newStatus }
        });
      }
      
      return json({
        success: true,
        message: "Template status updated!"
      });
    }

    return json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error('Error performing action:', error);
    return json({ success: false, message: "An error occurred. Please try again." });
  }
};

export default function ManageTemplates() {
  const { templates } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Filter templates based on search
  const filteredTemplates = templates.filter((template: any) => {
    const matchesSearch = searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.productTitle && template.productTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const handleDeleteTemplate = useCallback((template: Template) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (templateToDelete) {
      const formData = new FormData();
      formData.append("action", "delete_template");
      formData.append("templateId", templateToDelete.id);
      submit(formData, { method: "post" });
      setShowDeleteModal(false);
      setTemplateToDelete(null);
    }
  }, [templateToDelete, submit]);

  const handleToggleTemplate = useCallback((templateId: string) => {
    const formData = new FormData();
    formData.append("action", "toggle_template");
    formData.append("templateId", templateId);
    submit(formData, { method: "post" });
  }, [submit]);

  const handlePreviewTemplate = useCallback((template: Template) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  }, []);

  const parseTemplateData = (templateData: string) => {
    try {
      return JSON.parse(templateData);
    } catch (error) {
      return null;
    }
  };

  // Create table rows
  const templateRows = filteredTemplates.map((template: any) => {
    const parsedData = parseTemplateData(template.templateData);
    const elementsCount = parsedData?.elements?.length || 0;
    
    return [
      <div key={template.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div>
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            {template.name}
          </Text>
          {template.description && (
            <>
              <br />
              <Text variant="bodySm" tone="subdued" as="span">
                {template.description}
              </Text>
            </>
          )}
        </div>
      </div>,
      template.productTitle || 'Unknown Product',
      elementsCount,
      new Date(template.updatedAt).toLocaleDateString(),
      <Badge key={`status-${template.id}`} tone={template.isActive ? 'success' : 'critical'}>
        {template.isActive ? 'Active' : 'Inactive'}
      </Badge>,
      <div key={`actions-${template.id}`}>
        <InlineStack gap="200">
          <Button
            size="slim"
            onClick={() => handlePreviewTemplate(template)}
          >
            Preview
          </Button>
          <Button
            size="slim"
            onClick={() => handleToggleTemplate(template.id)}
          >
            {template.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="slim"
            tone="critical"
            onClick={() => handleDeleteTemplate(template)}
          >
            Delete
          </Button>
        </InlineStack>
      </div>
    ];
  });

  return (
    <Page
      title="Manage Templates"
      backAction={{ url: "/app" }}
      primaryAction={{
        content: "Create New Template",
        url: "/app/templates",
      }}
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
                {/* Search */}
                <div style={{ maxWidth: '300px' }}>
                  <TextField
                    label="Search templates"
                    labelHidden
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search templates..."
                    prefix={<SearchIcon />}
                    autoComplete="off"
                  />
                </div>

                {filteredTemplates.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'text', 'text', 'text']}
                    headings={['Template Name', 'Product', 'Elements', 'Last Updated', 'Status', 'Actions']}
                    rows={templateRows}
                    hideScrollIndicator
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      {searchQuery ? 'No templates found matching your search.' : 'No templates found. Create your first template to get started!'}
                    </Text>
                    {!searchQuery && (
                      <div style={{ marginTop: '16px' }}>
                        <Button url="/app/templates" variant="primary">
                          Create Template
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Template"
        primaryAction={{
          content: 'Delete',
          onAction: confirmDelete,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowDeleteModal(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete the template "{templateToDelete?.name}"? This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>

      {/* Template Preview Modal */}
      <Modal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={`Template Preview: ${previewTemplate?.name}`}
        size="large"
      >
        <Modal.Section>
          {previewTemplate && (
            <BlockStack gap="400">
              <div>
                <Text variant="headingMd" as="h3">Template Details</Text>
                <Box paddingBlockStart="200">
                  <BlockStack gap="200">
                    <Text as="p"><strong>Name:</strong> {previewTemplate.name}</Text>
                    <Text as="p"><strong>Product:</strong> {previewTemplate.productTitle}</Text>
                    <Text as="p"><strong>Description:</strong> {previewTemplate.description || 'No description'}</Text>
                    <Text as="p"><strong>Created:</strong> {new Date(previewTemplate.createdAt).toLocaleDateString()}</Text>
                    <Text as="p"><strong>Last Updated:</strong> {new Date(previewTemplate.updatedAt).toLocaleDateString()}</Text>
                  </BlockStack>
                </Box>
              </div>
              
              <div>
                <Text variant="headingMd" as="h3">Template Configuration</Text>
                <Box paddingBlockStart="200">
                  <div style={{
                    backgroundColor: '#f6f6f7',
                    padding: '16px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    <pre>{JSON.stringify(parseTemplateData(previewTemplate.templateData), null, 2)}</pre>
                  </div>
                </Box>
              </div>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}