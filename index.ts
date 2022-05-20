/**
 * Export AKS
 */
import * as aks from "./src/azure/aks"

export const kubernetesCluster = {
  resourceName: aks.cluster.name,
  resourceGroupName: aks.resourceGroup.name,
  domainName: aks.cluster.fqdn,
  ipAddress: [aks.publicIngressIpAddress.ipAddress],
}

/**
 * Export container registry
 */
import { containerRegistry as registry, resourceGroup as acrResourceGroup } from "./src/azure/acr"

export const containerRegistry = {
  registryName: registry.name,
  resourceGroupName: acrResourceGroup.name,
}

/**
 * Export DNS zone
 */
import * as dns from "./src/azure/dns"

export const dnsZone = {
  zoneName: dns.dnsZone.name,
  resourceGroupName: dns.resourceGroup.name,
  nameServers: dns.dnsZone.nameServers
}

/**
 * Export K8s imports
 */
export * from "./src/kubernetes"
