import { json, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { 
  Card, 
  Page, 
  Layout, 
  Text, 
  Button, 
  DataTable, 
  TextField,
  Select,
  Checkbox,
  Modal,
  FormLayout,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  Popover,
  ActionList
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { PlusIcon, ChevronDownIcon } from "@shopify/polaris-icons";

interface OptionField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'color' | 'number' | 'file';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface OptionSet {
  id: string;
  name: string;
  description: string;
  fields: OptionField[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productCount: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Mock data for now - will be replaced with actual database calls
  const optionSets: OptionSet[] = [
    {
      id: '1',
      name: 'secondm product',
      description: 'Basic customization options',
      fields: [
        {
          id: 'field1',
          name: 'custom_text',
          type: 'text',
          label: 'Custom Text',
          required: true,
          placeholder: 'Enter your text...'
        }
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productCount: 1
    },
    {
      id: '2',
      name: 'first product',
      description: 'Advanced customization options',
      fields: [
        {
          id: 'field1',
          name: 'main_text',
          type: 'text',
          label: 'Main Text',
          required: true,
        },
        {
          id: 'field2',
          name: 'color',
          type: 'color',
          label: 'Color',
          required: false,
        }
      ],
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productCount: 0
    }
  ];

  return json({ optionSets });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get("action") as string;

  // Mock actions for now
  if (action === "create") {
    console.log("Creating option set:", {
      name: formData.get("name"),
      description: formData.get("description"),
      fields: formData.get("fields"),
      isActive: formData.get("isActive")
    });
    
    return json({ 
      success: true, 
      message: "Option set created successfully!" 
    });
  }

  if (action === "update") {
    console.log("Updating option set:", formData.get("optionSetId"));
    return json({ 
      success: true, 
      message: "Option set updated successfully!" 
    });
  }

  if (action === "delete") {
    console.log("Deleting option set:", formData.get("optionSetId"));
    return json({ success: true, message: "Option set deleted successfully!" });
  }

  if (action === "toggle") {
    console.log("Toggling option set:", formData.get("optionSetId"));
    return json({ success: true, message: "Option set status updated!" });
  }

  return json({ success: false, message: "Invalid action" });
};

export default function OptionSets() {
  const { optionSets } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [modalActive, setModalActive] = useState(false);
  const [editingOptionSet, setEditingOptionSet] = useState<OptionSet | null>(null);
  const [optionSetName, setOptionSetName] = useState("");
  const [optionSetDescription, setOptionSetDescription] = useState("");
  const [optionSetFields, setOptionSetFields] = useState<OptionField[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [popoverActive, setPopoverActive] = useState<string | null>(null);

  const handleModalClose = useCallback(() => {
    setModalActive(false);
    setEditingOptionSet(null);
    setOptionSetName("");
    setOptionSetDescription("");
    setOptionSetFields([]);
    setIsActive(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setEditingOptionSet(null);
    setOptionSetName("");
    setOptionSetDescription("");
    setOptionSetFields([{
      id: 'field1',
      name: 'custom_field',
      type: 'text',
      label: 'Custom Field',
      required: true,
      placeholder: ''
    }]);
    setIsActive(true);
    setModalActive(true);
  }, []);

  const handleEdit = useCallback((optionSet: OptionSet) => {
    setEditingOptionSet(optionSet);
    setOptionSetName(optionSet.name);
    setOptionSetDescription(optionSet.description || "");
    setOptionSetFields(optionSet.fields);
    setIsActive(optionSet.isActive);
    setModalActive(true);
  }, []);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("action", editingOptionSet ? "update" : "create");
    if (editingOptionSet) {
      formData.append("optionSetId", editingOptionSet.id);
    }
    formData.append("name", optionSetName);
    formData.append("description", optionSetDescription);
    formData.append("fields", JSON.stringify(optionSetFields));
    formData.append("isActive", isActive.toString());
    
    submit(formData, { method: "post" });
    handleModalClose();
  }, [editingOptionSet, optionSetName, optionSetDescription, optionSetFields, isActive, submit, handleModalClose]);

  const handleDelete = useCallback((optionSetId: string) => {
    if (confirm("Are you sure you want to delete this option set?")) {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("optionSetId", optionSetId);
      
      submit(formData, { method: "post" });
    }
  }, [submit]);

  const handleToggleStatus = useCallback((optionSetId: string, currentStatus: boolean) => {
    const formData = new FormData();
    formData.append("action", "toggle");
    formData.append("optionSetId", optionSetId);
    formData.append("isActive", (!currentStatus).toString());
    
    submit(formData, { method: "post" });
  }, [submit]);

  const addField = useCallback(() => {
    const newField: OptionField = {
      id: `field${optionSetFields.length + 1}`,
      name: `custom_field_${optionSetFields.length + 1}`,
      type: 'text',
      label: 'New Field',
      required: false,
      placeholder: ''
    };
    setOptionSetFields([...optionSetFields, newField]);
  }, [optionSetFields]);

  const updateField = useCallback((index: number, updates: Partial<OptionField>) => {
    const updatedFields = [...optionSetFields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setOptionSetFields(updatedFields);
  }, [optionSetFields]);

  const removeField = useCallback((index: number) => {
    setOptionSetFields(optionSetFields.filter((_, i) => i !== index));
  }, [optionSetFields]);

  const togglePopover = useCallback((optionSetId: string) => {
    setPopoverActive(popoverActive === optionSetId ? null : optionSetId);
  }, [popoverActive]);

  const optionSetRows = optionSets.map((optionSet: OptionSet) => [
    <div key={optionSet.id}>
      <Text variant="bodyMd" fontWeight="semibold" as="span">
        {optionSet.name}
      </Text>
      <br />
      <Text variant="bodySm" tone="subdued" as="span">
        {optionSet.productCount} Product{optionSet.productCount !== 1 ? 's' : ''}
      </Text>
    </div>,
    <Badge key={`status-${optionSet.id}`} tone={optionSet.isActive ? 'success' : 'warning'}>
      {optionSet.isActive ? 'Active' : 'Inactive'}
    </Badge>,
    <div key={`actions-${optionSet.id}`}>
      <Popover
        active={popoverActive === optionSet.id}
        activator={
          <Button
            disclosure
            onClick={() => togglePopover(optionSet.id)}
          >
            Link products
          </Button>
        }
        onClose={() => setPopoverActive(null)}
      >
        <ActionList
          items={[
            {
              content: 'Link products',
              url: `/app/option-sets/${optionSet.id}/products`,
            },
            {
              content: 'Edit option set',
              onAction: () => {
                handleEdit(optionSet);
                setPopoverActive(null);
              },
            },
            {
              content: optionSet.isActive ? 'Deactivate' : 'Activate',
              onAction: () => {
                handleToggleStatus(optionSet.id, optionSet.isActive);
                setPopoverActive(null);
              },
            },
            {
              content: 'Delete',
              destructive: true,
              onAction: () => {
                handleDelete(optionSet.id);
                setPopoverActive(null);
              },
            },
          ]}
        />
      </Popover>
    </div>,
    <Button
      key={`more-${optionSet.id}`}
      icon={ChevronDownIcon}
      variant="plain"
      onClick={() => togglePopover(`more-${optionSet.id}`)}
    />
  ]);

  const fieldTypeOptions = [
    { label: 'Text', value: 'text' },
    { label: 'Textarea', value: 'textarea' },
    { label: 'Select', value: 'select' },
    { label: 'Color', value: 'color' },
    { label: 'Number', value: 'number' },
    { label: 'File Upload', value: 'file' },
  ];

  return (
    <Page
      title="Option sets"
      primaryAction={{
        content: "Create option set",
        icon: PlusIcon,
        onAction: handleCreateNew,
      }}
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
          <Card padding="0">
            {optionSets.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text']}
                headings={['', '', '', '']}
                rows={optionSetRows}
                hideScrollIndicator
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text variant="bodyMd" tone="subdued" as="p">
                  No option sets created yet. Create your first option set to get started!
                </Text>
                <div style={{ marginTop: '16px' }}>
                  <Button variant="primary" onClick={handleCreateNew}>
                    Create option set
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalActive}
        onClose={handleModalClose}
        title={editingOptionSet ? "Edit Option Set" : "Create New Option Set"}
        primaryAction={{
          content: editingOptionSet ? "Update Option Set" : "Create Option Set",
          onAction: handleSave,
          disabled: !optionSetName.trim(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleModalClose,
          },
        ]}
        size="large"
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Option Set Name"
              value={optionSetName}
              onChange={setOptionSetName}
              placeholder="Enter option set name..."
              autoComplete="off"
            />
            
            <TextField
              label="Description"
              value={optionSetDescription}
              onChange={setOptionSetDescription}
              placeholder="Enter option set description..."
              multiline={3}
              autoComplete="off"
            />

            <Checkbox
              label="Active"
              checked={isActive}
              onChange={setIsActive}
            />

            <div>
              <InlineStack gap="200" align="space-between">
                <Text variant="headingMd" as="h3">
                  Option Fields
                </Text>
                <Button size="slim" onClick={addField}>
                  Add Field
                </Button>
              </InlineStack>
              
              <BlockStack gap="400">
                {optionSetFields.map((field, index) => (
                  <Card key={field.id}>
                    <BlockStack gap="300">
                      <InlineStack gap="300">
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Field Label"
                            value={field.label}
                            onChange={(value) => updateField(index, { label: value })}
                            autoComplete="off"
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Field Name"
                            value={field.name}
                            onChange={(value) => updateField(index, { name: value })}
                            autoComplete="off"
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <Select
                            label="Field Type"
                            options={fieldTypeOptions}
                            value={field.type}
                            onChange={(value) => updateField(index, { type: value as any })}
                          />
                        </div>
                      </InlineStack>
                      
                      <InlineStack gap="300">
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Placeholder"
                            value={field.placeholder || ''}
                            onChange={(value) => updateField(index, { placeholder: value })}
                            autoComplete="off"
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'end', gap: '12px' }}>
                          <Checkbox
                            label="Required"
                            checked={field.required}
                            onChange={(value) => updateField(index, { required: value })}
                          />
                          <Button 
                            size="slim" 
                            variant="plain" 
                            tone="critical"
                            onClick={() => removeField(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </InlineStack>
                      
                      {field.type === 'select' && (
                        <TextField
                          label="Options (comma-separated)"
                          value={field.options?.join(', ') || ''}
                          onChange={(value) => updateField(index, { 
                            options: value.split(',').map(opt => opt.trim()).filter(Boolean) 
                          })}
                          placeholder="Option 1, Option 2, Option 3"
                          autoComplete="off"
                        />
                      )}
                    </BlockStack>
                  </Card>
                ))}
                
                {optionSetFields.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      No fields added yet. Click "Add Field" to create your first field.
                    </Text>
                  </div>
                )}
              </BlockStack>
            </div>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}