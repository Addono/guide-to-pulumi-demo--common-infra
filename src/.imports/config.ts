import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure-native"
import { z } from "zod"

const config = new pulumi.Config()
const moduleConfig = new pulumi.Config("azure-native")

/**
 * Azure configs
 */
export const subscriptionId = moduleConfig.require("subscriptionId")

/**
 * AKS configs
 */
export const defaultNodePoolVmSize = config.get("defaultNodePoolVmSize") || "Standard_B2s"
export const defaultNodePoolEnableAutoScaling = config.getBoolean("defaultNodePoolEnableAutoScaling") || false
export const defaultNodePoolCount = z
  .number({
    description: "The initial target number of nodes in the nodepool.",
  })
  .min(1)
  .parse(config.getNumber("defaultNodePoolCount") ?? 1)
export const defaultNodePoolMinCount = z
  .number({
    description: "The minimum number of nodes that the nodepool can be scaled down to.",
  })
  .min(1)
  .optional()
  .parse(config.getNumber("defaultNodePoolMinCount"))
export const defaultNodePoolMaxCount = z
  .number({
    description: "The maximum number of nodes that the nodepool can be scaled up to.",
  })
  .min(1)
  .optional()
  .parse(config.getNumber("defaultNodePoolMaxCount"))

export const kubernetesVersion = config.get("kubernetesVersion") || "1.22.4"

if (
  defaultNodePoolEnableAutoScaling &&
  (defaultNodePoolMinCount === undefined || defaultNodePoolMaxCount === undefined)
) {
  throw new Error(
    "Options 'defaultNodePoolMinCount' and 'defaultNodePoolMaxCount'" +
      "must be provided when 'defaultNodeEnableAutoScaling' is 'true'."
  )
}

/**
 * ACR
 */
export const acrSKU = config.get("acrSKU") || azure.containerregistry.SkuName.Standard

/**
 * DNS
 */
export const domainName = config.require("domainName")
