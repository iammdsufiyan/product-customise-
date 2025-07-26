import { json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Authenticate the request
    const { session } = await authenticate.admin(request);
    
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    
    if (!productId) {
      return json({ error: "Product ID is required" }, { status: 400 });
    }

    // Clean product ID (remove Shopify GID prefix if present)
    const cleanProductId = productId.replace('gid://shopify/Product/', '');

    // Find existing template for this product
    const productOptionSet = await db.productOptionSet.findFirst({
      where: {
        productId: cleanProductId,
        isActive: true
      },
      include: {
        optionSet: {
          select: {
            id: true,
            name: true,
            description: true,
            fields: true,
            updatedAt: true,
            createdAt: true
          }
        }
      }
    });

    if (!productOptionSet) {
      return json({ hasTemplate: false });
    }

    // Parse template data
    let templateData = null;
    try {
      templateData = JSON.parse(productOptionSet.optionSet.fields);
    } catch (error) {
      console.error('Error parsing template data:', error);
      return json({ error: "Invalid template data" }, { status: 500 });
    }

    return json({
      hasTemplate: true,
      template: {
        id: productOptionSet.optionSet.id,
        name: productOptionSet.optionSet.name,
        description: productOptionSet.optionSet.description,
        data: templateData,
        createdAt: productOptionSet.optionSet.createdAt,
        updatedAt: productOptionSet.optionSet.updatedAt
      }
    });

  } catch (error) {
    console.error('Error loading template:', error);
    return json({ 
      error: "Failed to load template", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};

// Handle CORS for frontend requests
export const headers = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});