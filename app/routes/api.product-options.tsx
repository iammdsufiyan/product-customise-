import { json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // For public API access, we'll skip authentication for storefront requests
    // Check if this is a storefront request by looking at the referer
    const referer = request.headers.get('referer');
    const isStorefrontRequest = referer && !referer.includes('/admin/');
    
    if (!isStorefrontRequest) {
      // Only authenticate admin requests
      await authenticate.admin(request);
    }
    
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    
    if (!productId) {
      return json({ hasOptions: false, error: "Product ID is required" }, { status: 400 });
    }

    // Check if product has customization options in database
    // Handle both full GID and numeric ID formats
    const cleanProductId = productId.replace('gid://shopify/Product/', '');
    
    const productOptionSet = await db.productOptionSet.findFirst({
      where: {
        productId: cleanProductId,
        isActive: true
      },
      include: {
        optionSet: true
      }
    });

    if (!productOptionSet) {
      return json({ hasOptions: false });
    }

    // Parse the template data
    let template = null;
    try {
      template = JSON.parse(productOptionSet.optionSet.fields);
    } catch (error) {
      console.error('Error parsing template fields:', error);
      return json({ hasOptions: false, error: "Invalid template data" });
    }

    return json({
      hasOptions: true,
      template: {
        id: productOptionSet.optionSet.id,
        name: productOptionSet.optionSet.name,
        description: productOptionSet.optionSet.description,
        elements: template.elements || [],
        additionalCharge: template.additionalCharge || 0,
        livePreview: template.livePreview !== false,
        canvasWidth: template.canvasWidth || 1000,
        canvasHeight: template.canvasHeight || 1000,
        viewBackground: template.viewBackground || 'blank'
      }
    });

  } catch (error) {
    console.error('Error checking product options:', error);
    return json({ hasOptions: false, error: "Internal server error" }, { status: 500 });
  }
};

// Handle CORS for frontend requests
export const headers = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});