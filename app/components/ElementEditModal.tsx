import { memo, useCallback } from "react";
import {
  Modal,
  BlockStack,
  Card,
  Text,
  TextField,
  Select,
  Button,
  InlineStack,
  Checkbox,
  ColorPicker
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

interface ElementEditModalProps {
  open: boolean;
  onClose: () => void;
  editingElement: CustomizationElement | null;
  setEditingElement: (element: CustomizationElement | null) => void;
  onSave: () => void;
}

export const ElementEditModal = memo(({
  open,
  onClose,
  editingElement,
  setEditingElement,
  onSave
}: ElementEditModalProps) => {
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    onSave();
  }, [onSave]);

  const updateElement = useCallback((updates: Partial<CustomizationElement>) => {
    if (editingElement) {
      setEditingElement({ ...editingElement, ...updates });
    }
  }, [editingElement, setEditingElement]);

  const updateProperties = useCallback((updates: Partial<CustomizationElement['properties']>) => {
    if (editingElement) {
      setEditingElement({
        ...editingElement,
        properties: { ...editingElement.properties, ...updates }
      });
    }
  }, [editingElement, setEditingElement]);

  if (!editingElement) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${editingElement.type === 'text' ? 'Text' : 'Upload'} Element`}
      size="large"
    >
      <Modal.Section>
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
                    onChange={(value) => updateElement({ x: parseInt(value) || 0 })}
                    suffix="px"
                    type="number"
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Y Position"
                    value={editingElement.y.toString()}
                    onChange={(value) => updateElement({ y: parseInt(value) || 0 })}
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
                    onChange={(value) => updateElement({ width: parseInt(value) || 100 })}
                    suffix="px"
                    type="number"
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Height"
                    value={editingElement.height.toString()}
                    onChange={(value) => updateElement({ height: parseInt(value) || 50 })}
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
                  onChange={(value) => updateProperties({ placeholder: value })}
                  autoComplete="off"
                />
                <InlineStack gap="200">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Font Size"
                      value={editingElement.properties.fontSize?.toString() || '16'}
                      onChange={(value) => updateProperties({ fontSize: parseInt(value) || 16 })}
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
                      onChange={(value) => updateProperties({ fontFamily: value })}
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
                    onChange={(checked) => updateProperties({ bold: checked })}
                  />
                  <Checkbox
                    label="Italic"
                    checked={editingElement.properties.italic || false}
                    onChange={(checked) => updateProperties({ italic: checked })}
                  />
                  <Checkbox
                    label="Required"
                    checked={editingElement.properties.required || false}
                    onChange={(checked) => updateProperties({ required: checked })}
                  />
                </InlineStack>
                <TextField
                  label="Max Length"
                  value={editingElement.properties.maxLength?.toString() || ''}
                  onChange={(value) => updateProperties({ maxLength: parseInt(value) || undefined })}
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
                  onChange={(value) => updateProperties({ maxLength: parseInt(value) || 5 })}
                  type="number"
                  autoComplete="off"
                />
                <Checkbox
                  label="Required"
                  checked={editingElement.properties.required || false}
                  onChange={(checked) => updateProperties({ required: checked })}
                />
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </Modal.Section>
      
      <Modal.Section>
        <InlineStack align="end" gap="200">
          <Button onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </InlineStack>
      </Modal.Section>
    </Modal>
  );
});

ElementEditModal.displayName = 'ElementEditModal';