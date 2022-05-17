import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure-native"

import { acrSKU } from "../.imports/config"

// Notes:
// - Azure does not allow hyphens in registry name
// - Registry name must be unique across all azure customers
const registryName = `pulumidemo${pulumi.getStack()}`.replace(/-/g, "")

const resourceGroupName = `${registryName}-acr-rg`
export const resourceGroup = new azure.resources.ResourceGroup("acr-resource-group", {
  resourceGroupName,
  tags: {
    project: pulumi.getProject(),
    stack: pulumi.getStack(),
  },
})

export const containerRegistry = new azure.containerregistry.Registry("acr", {
  adminUserEnabled: true,
  registryName: registryName,
  resourceGroupName: resourceGroup.name,
  sku: {
    name: acrSKU,
  },
  tags: {
    project: pulumi.getProject(),
    stack: pulumi.getStack(),
  },
})
