import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { Card, Page, Layout, Text, Button, DataTable, Badge, BlockStack } from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Fetch actual data from database
    const totalOptionSets = await db.optionSet.count({
      where: { isActive: true }
    });
    
    const activeProductOptionSets = await db.productOptionSet.count({
      where: { isActive: true }
    });
    
    const totalPersonalizations = await db.customerPersonalization.count();
    
    // Fetch recent personalizations
    const recentPersonalizations = await db.customerPersonalization.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productId: true,
        customerData: true,
        createdAt: true,
        optionSetId: true
      }
    });

    const analytics = {
      totalTemplates: totalOptionSets,
      totalPersonalizations: totalPersonalizations,
      activeTemplates: activeProductOptionSets,
    };

    return json({
      recentPersonalizations,
      analytics,
    });
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // Fallback to empty data if there's an error
    return json({
      recentPersonalizations: [],
      analytics: {
        totalTemplates: 0,
        totalPersonalizations: 0,
        activeTemplates: 0,
      },
    });
  }
};

export default function Index() {
  const { recentPersonalizations, analytics } = useLoaderData<typeof loader>();

  const recentRows = recentPersonalizations.map((personalization: any) => [
    personalization.productId,
    personalization.template?.name || 'Unknown Template',
    personalization.customerData ? Object.keys(JSON.parse(personalization.customerData)).length : 0,
    new Date(personalization.createdAt).toLocaleDateString(),
    <Badge key={personalization.id} tone="success">Active</Badge>,
  ]);

  return (
    <Page
      title="Product Customization Dashboard"
      primaryAction={{
        content: "Create Template",
        icon: PlusIcon,
        url: "/app/templates",
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Analytics Cards */}
            <Layout>
              <Layout.Section variant="oneThird">
                <Card>
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <Text variant="headingLg" as="h3">
                      {analytics.totalTemplates}
                    </Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Total Templates
                    </Text>
                  </div>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Card>
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <Text variant="headingLg" as="h3">
                      {analytics.activeTemplates}
                    </Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Active Templates
                    </Text>
                  </div>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Card>
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <Text variant="headingLg" as="h3">
                      {analytics.totalPersonalizations}
                    </Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Total Customizations
                    </Text>
                  </div>
                </Card>
              </Layout.Section>
            </Layout>

            {/* Quick Actions */}
            <Card>
              <div style={{ padding: '16px' }}>
                <Text variant="headingMd" as="h2">
                  Quick Actions
                </Text>
                <div style={{ marginTop: '16px' }}>
                  <BlockStack gap="300">
                    <Button url="/app/manage-templates" variant="primary">
                      Manage Templates
                    </Button>
                    <Button url="/app/products">
                      Assign to Products
                    </Button>
                    <Button url="/app/analytics">
                      View Analytics
                    </Button>
                  </BlockStack>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card>
              <div style={{ padding: '16px' }}>
                <Text variant="headingMd" as="h2">
                  Recent Customizations
                </Text>
                {recentPersonalizations.length > 0 ? (
                  <div style={{ marginTop: '16px' }}>
                    <DataTable
                      columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
                      headings={['Product ID', 'Template', 'Fields', 'Date', 'Status']}
                      rows={recentRows}
                    />
                  </div>
                ) : (
                  <div style={{ marginTop: '16px', textAlign: 'center', padding: '32px' }}>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      No customizations yet. Create your first template to get started!
                    </Text>
                    <div style={{ marginTop: '16px' }}>
                      <Button url="/app/templates" variant="primary">
                        Create Template
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}