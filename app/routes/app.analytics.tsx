import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { 
  Card, 
  Page, 
  Layout, 
  Text, 
  DataTable, 
  Select,
  BlockStack,
  InlineStack,
  Badge
} from "@shopify/polaris";
import { useState } from "react";

interface AnalyticsData {
  templateId: string;
  templateName: string;
  totalCustomizations: number;
  conversionRate: number;
  averageOrderValue: number;
  revenue: number;
  topProducts: Array<{
    productId: string;
    productTitle: string;
    customizations: number;
  }>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Mock analytics data - will be replaced with actual database calls
  const analyticsData: AnalyticsData[] = [
    {
      templateId: '1',
      templateName: 'Basic Text Personalization',
      totalCustomizations: 156,
      conversionRate: 12.5,
      averageOrderValue: 45.99,
      revenue: 7174.44,
      topProducts: [
        { productId: '1', productTitle: 'Custom T-Shirt', customizations: 89 },
        { productId: '2', productTitle: 'Personalized Mug', customizations: 67 },
      ]
    },
    {
      templateId: '2',
      templateName: 'Advanced Canvas Design',
      totalCustomizations: 89,
      conversionRate: 18.7,
      averageOrderValue: 67.50,
      revenue: 6007.50,
      topProducts: [
        { productId: '3', productTitle: 'Custom Canvas Print', customizations: 45 },
        { productId: '4', productTitle: 'Design Your Own Poster', customizations: 44 },
      ]
    }
  ];

  const overallStats = {
    totalCustomizations: analyticsData.reduce((sum, item) => sum + item.totalCustomizations, 0),
    averageConversionRate: analyticsData.reduce((sum, item) => sum + item.conversionRate, 0) / analyticsData.length,
    totalRevenue: analyticsData.reduce((sum, item) => sum + item.revenue, 0),
    averageOrderValue: analyticsData.reduce((sum, item) => sum + item.averageOrderValue, 0) / analyticsData.length,
  };

  return json({
    analyticsData,
    overallStats,
  });
};

export default function Analytics() {
  const { analyticsData, overallStats } = useLoaderData<typeof loader>();
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  const periodOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 90 days', value: '90' },
    { label: 'Last 12 months', value: '365' },
  ];

  const templateRows = analyticsData.map((template) => [
    template.templateName,
    template.totalCustomizations,
    `${template.conversionRate.toFixed(1)}%`,
    `$${template.averageOrderValue.toFixed(2)}`,
    `$${template.revenue.toFixed(2)}`,
    <Badge key={template.templateId} tone="success">
      Active
    </Badge>,
  ]);

  const topProductsRows = analyticsData
    .flatMap(template => 
      template.topProducts.map(product => ({
        ...product,
        templateName: template.templateName
      }))
    )
    .sort((a, b) => b.customizations - a.customizations)
    .slice(0, 10)
    .map((product) => [
      product.productTitle,
      product.templateName,
      product.customizations,
      `${((product.customizations / overallStats.totalCustomizations) * 100).toFixed(1)}%`,
    ]);

  return (
    <Page
      title="Analytics & Reports"
      subtitle="Track performance of your personalization templates"
      backAction={{ url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="400" align="space-between">
                <Text variant="headingMd" as="h2">
                  Performance Overview
                </Text>
                <div style={{ minWidth: '200px' }}>
                  <Select
                    label="Time Period"
                    options={periodOptions}
                    value={selectedPeriod}
                    onChange={setSelectedPeriod}
                  />
                </div>
              </InlineStack>

              {/* Overall Stats Cards */}
              <Layout>
                <Layout.Section variant="oneThird">
                  <Card>
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">
                        {overallStats.totalCustomizations}
                      </Text>
                      <Text variant="bodyMd" tone="subdued" as="p">
                        Total Customizations
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneThird">
                  <Card>
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">
                        {overallStats.averageConversionRate.toFixed(1)}%
                      </Text>
                      <Text variant="bodyMd" tone="subdued" as="p">
                        Avg. Conversion Rate
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneThird">
                  <Card>
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">
                        ${overallStats.averageOrderValue.toFixed(2)}
                      </Text>
                      <Text variant="bodyMd" tone="subdued" as="p">
                        Avg. Order Value
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneThird">
                  <Card>
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">
                        ${overallStats.totalRevenue.toFixed(2)}
                      </Text>
                      <Text variant="bodyMd" tone="subdued" as="p">
                        Total Revenue
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>
              </Layout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Template Performance
              </Text>
              
              {analyticsData.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'numeric', 'text', 'text', 'text', 'text']}
                  headings={['Template', 'Customizations', 'Conversion Rate', 'Avg. Order Value', 'Revenue', 'Status']}
                  rows={templateRows}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    No analytics data available yet. Start using your templates to see performance metrics!
                  </Text>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Top Performing Products
              </Text>
              
              {topProductsRows.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text']}
                  headings={['Product', 'Template', 'Customizations', 'Share']}
                  rows={topProductsRows}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    No product data available yet.
                  </Text>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Insights & Recommendations
              </Text>
              
              <BlockStack gap="300">
                <div style={{ padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    💡 Top Performing Template
                  </Text>
                  <Text variant="bodyMd" as="p">
                    "Advanced Canvas Design" has the highest conversion rate at 18.7%. Consider promoting this template more prominently.
                  </Text>
                </div>
                
                <div style={{ padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    📈 Growth Opportunity
                  </Text>
                  <Text variant="bodyMd" as="p">
                    "Basic Text Personalization" has high volume but lower conversion. Consider A/B testing different field configurations.
                  </Text>
                </div>
                
                <div style={{ padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    🎯 Revenue Focus
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Products with personalization generate ${overallStats.averageOrderValue.toFixed(2)} average order value. Consider expanding to more products.
                  </Text>
                </div>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}