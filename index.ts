/**
 * Export AKS
 */
import { resourceGroup as aksResourceGroup, cluster as aksCluster } from "./src/azure/aks"

export const kubernetesCluster = {
  resourceName: aksCluster.name,
  resourceGroupName: aksResourceGroup.name,
}

/**
 * Export container registry
 */
import { containerRegistry as registry, resourceGroup as acrResourceGroup } from "./src/azure/acr"

export const containerRegistry = {
  registryName: registry.name,
  resourceGroupName: acrResourceGroup.name,
}
