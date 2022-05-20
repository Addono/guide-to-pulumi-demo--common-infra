import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure-native"

import { acrSKU } from "../.imports/config"

/**
 * Build the name of the registry, notes:
 * - Azure does not allow hyphens in registry name
 * - Registry name must be unique across all azure customers
 */
const registryName = `pulumidemo${pulumi.getStack()}`.replace(/-/g, "")

const resourceGroupName = `${registryName}-acr-rg`
export const resourceGroup = new azure.resources.ResourceGroup("acr-resource-group", {
  resourceGroupName,
})

export const containerRegistry = new azure.containerregistry.Registry("acr", {
  adminUserEnabled: true,
  registryName: registryName,
  resourceGroupName: resourceGroup.name,
  sku: {
    name: acrSKU,
  },
})
