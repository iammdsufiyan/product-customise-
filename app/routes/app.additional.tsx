import { Page, Layout, Card, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function Additional() {
  return (
    <Page>
      <TitleBar title="Additional Features" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Additional Features
            </Text>
            <Text as="p">
              This page is reserved for additional features and functionality.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}