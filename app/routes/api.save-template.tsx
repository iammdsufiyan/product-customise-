import { json, ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    console.log('=== TEMPLATE SAVE REQUEST START ===');
    
    // Authenticate the request
    const { session } = await authenticate.admin(request);
    console.log('Authentication successful, shop:', session?.shop);
    
    if (request.method !== "POST") {
      console.log('Invalid method:', request.method);
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    const formData = await request.formData();
    const productId = formData.get("productId") as string;
    const templateData = formData.get("templateData") as string;
    const templateName = formData.get("templateName") as string;

    console.log('Form data received:', {
      productId,
      templateName,
      templateDataLength: templateData?.length || 0
    });

    if (!productId || !templateData) {
      console.log('Missing required fields:', { productId: !!productId, templateData: !!templateData });
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Parse template data
    let parsedTemplateData;
    try {
      parsedTemplateData = JSON.parse(templateData);
    } catch (error) {
      return json({ error: "Invalid template data" }, { status: 400 });
    }

    // Clean product ID (remove Shopify GID prefix if present)
    const cleanProductId = productId.replace('gid://shopify/Product/', '');
    console.log('Clean product ID:', cleanProductId);

    // Check if an option set already exists for this product
    console.log('Checking for existing product option set...');
    const existingProductOptionSet = await db.productOptionSet.findFirst({
      where: {
        productId: cleanProductId,
        isActive: true
      },
      include: {
        optionSet: true
      }
    });

    console.log('Existing product option set:', existingProductOptionSet ? 'Found' : 'Not found');

    let optionSetId;

    if (existingProductOptionSet) {
      console.log('Updating existing option set with ID:', existingProductOptionSet.optionSetId);
      // Update existing option set
      await db.optionSet.update({
        where: {
          id: existingProductOptionSet.optionSetId
        },
        data: {
          name: templateName || parsedTemplateData.viewName || 'Custom Template',
          description: `Template for ${parsedTemplateData.viewName || 'product customization'}`,
          fields: templateData,
          updatedAt: new Date()
        }
      });
      optionSetId = existingProductOptionSet.optionSetId;
      console.log('Option set updated successfully');
    } else {
      console.log('Creating new option set...');
      // Create new option set
      const newOptionSet = await db.optionSet.create({
        data: {
          name: templateName || parsedTemplateData.viewName || 'Custom Template',
          description: `Template for ${parsedTemplateData.viewName || 'product customization'}`,
          fields: templateData,
          isActive: true
        }
      });
      optionSetId = newOptionSet.id;
      console.log('New option set created with ID:', optionSetId);

      console.log('Creating product-option set relationship...');
      // Create product-option set relationship
      await db.productOptionSet.create({
        data: {
          productId: cleanProductId,
          productTitle: parsedTemplateData.productTitle || 'Product',
          productHandle: parsedTemplateData.productHandle || '',
          optionSetId: optionSetId,
          isActive: true
        }
      });
      console.log('Product-option set relationship created');
    }

    console.log(`Template saved successfully for product: ${cleanProductId}, optionSetId: ${optionSetId}`);
    console.log('=== TEMPLATE SAVE REQUEST SUCCESS ===');

    return json({
      success: true,
      message: "Template saved successfully!",
      optionSetId: optionSetId
    });

  } catch (error) {
    console.error('=== TEMPLATE SAVE ERROR ===');
    console.error('Error saving template:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('=== END ERROR ===');
    return json({
      error: "Failed to save template",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};

// Handle CORS for frontend requests
export const headers = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});