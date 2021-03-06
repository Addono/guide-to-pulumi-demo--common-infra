import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure-native"

import {
  defaultNodePoolCount,
  defaultNodePoolVmSize,
  defaultNodePoolEnableAutoScaling,
  defaultNodePoolMinCount,
  defaultNodePoolMaxCount,
  kubernetesVersion,
  subscriptionId,
} from "../.imports/config"
import { containerRegistry } from "./acr"

const managedClusterName = `${pulumi.getStack()}-aks`
const resourceGroupName = `${managedClusterName}-rg`
const nodeResourceGroupName = `${managedClusterName}-node-rg`

/**
 * Create a resource-group for the cluster
 */
export const resourceGroup = new azure.resources.ResourceGroup("aks-rg", {
  resourceGroupName,
})

/**
 * Register an IP address for the cluster
 */
export const publicIngressIpAddress = new azure.network.PublicIPAddress("aks-public-ip", {
  dnsSettings: {
    domainNameLabel: `${pulumi.getStack()}-lb-public-ip`,
  },
  publicIpAddressName: `${pulumi.getStack()}-lb-public-ip`,
  publicIPAllocationMethod: azure.network.IPAllocationMethod.Static,
  resourceGroupName: resourceGroup.name,
  sku: {
    name: azure.network.PublicIPAddressSkuName.Standard,
    tier: azure.network.PublicIPAddressSkuTier.Regional,
  },
})

/**
 * Handle IAM for the cluster
 */
const controlManagedIdentity = new azure.managedidentity.UserAssignedIdentity("aks-control-plane-managed-identity", {
  resourceGroupName: resourceGroup.name,
  resourceName: `${pulumi.getStack()}-aks-control-identity`,
})

const kubeletManagedIdentity = new azure.managedidentity.UserAssignedIdentity("aks-kubelet-managed-identity", {
  resourceGroupName: resourceGroup.name,
  resourceName: `${pulumi.getStack()}-aks-kubelet-identity`,
})

const ipRoleAssignmentControl = new azure.authorization.RoleAssignment(
  "network-contributor-role-assignment-control-plane",
  {
    principalId: controlManagedIdentity.principalId,
    principalType: azure.authorization.PrincipalType.ServicePrincipal,
    roleDefinitionId: `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/4d97b98b-1d4f-4787-a291-c67834d212e7`,
    scope: resourceGroup.id,
  }
)

const ipRoleAssignmentKubelet = new azure.authorization.RoleAssignment("network-contributor-role-assignment-kubelet", {
  principalId: kubeletManagedIdentity.principalId,
  principalType: azure.authorization.PrincipalType.ServicePrincipal,
  roleDefinitionId: `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/4d97b98b-1d4f-4787-a291-c67834d212e7`,
  scope: resourceGroup.id,
})

const commonAcrRoleAssignment = new azure.authorization.RoleAssignment(
  "acrpull-common-registry-role-assignment-kubelet",
  {
    principalId: kubeletManagedIdentity.principalId,
    principalType: azure.authorization.PrincipalType.ServicePrincipal,
    roleDefinitionId: `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-43fe172d538d`,
    scope: containerRegistry.id,
  }
)

const managedIdentityOperatorRoleAssignment = new azure.authorization.RoleAssignment(
  "managed-identity-operator-role-assignment-control-plane",
  {
    principalId: controlManagedIdentity.principalId,
    principalType: azure.authorization.PrincipalType.ServicePrincipal,
    roleDefinitionId: `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/f1a07417-d97a-45cb-824c-7a7467783830`,
    scope: kubeletManagedIdentity.id,
  }
)

/**
 * Create the cluster
 */
export const cluster = new azure.containerservice.ManagedCluster(
  "aks-cluster",
  {
    resourceName: managedClusterName,
    resourceGroupName: resourceGroup.name,
    dnsPrefix: resourceGroup.name,
    enableRBAC: true,
    kubernetesVersion: kubernetesVersion,
    nodeResourceGroup: nodeResourceGroupName,
    identity: {
      type: azure.containerservice.ResourceIdentityType.UserAssigned,
      userAssignedIdentities: controlManagedIdentity.id.apply((controlId) => ({
        [controlId]: {},
      })),
    },
    servicePrincipalProfile: {
      clientId: controlManagedIdentity.clientId,
    },
    identityProfile: {
      kubeletidentity: {
        resourceId: kubeletManagedIdentity.id,
        objectId: kubeletManagedIdentity.principalId,
        clientId: kubeletManagedIdentity.clientId,
      },
    },
    tags: {
      project: pulumi.getProject(),
      stack: pulumi.getStack(),
    },
    /**
     * WARNING: The following sections are broken. The options work in the
     * creation of a new cluster, but not when updating an existing cluster.
     * Any changes made to an existing cluster should be manually performed
     * in the Azure portal or through the az cli
     */
    networkProfile: {
      loadBalancerProfile: {
        outboundIPs: {
          publicIPs: [
            {
              id: publicIngressIpAddress.id,
            },
          ],
        },
      },
    },
    // Agent pools can only be updated through the az cli:
    // https://docs.microsoft.com/en-us/rest/api/aks/agent-pools/create-or-update
    agentPoolProfiles: [
      {
        name: "defaultpool",
        mode: azure.containerservice.AgentPoolMode.System,
        count: defaultNodePoolCount,
        enableAutoScaling: defaultNodePoolEnableAutoScaling,
        ...(defaultNodePoolEnableAutoScaling && { minCount: defaultNodePoolMinCount }),
        ...(defaultNodePoolEnableAutoScaling && { maxCount: defaultNodePoolMaxCount }),
        maxPods: 30,
        type: azure.containerservice.AgentPoolType.VirtualMachineScaleSets,
        vmSize: defaultNodePoolVmSize,
        osDiskSizeGB: 30,
        osType: azure.containerservice.OSType.Linux,
        osDiskType: azure.containerservice.OSDiskType.Managed,
        osSKU: azure.containerservice.OSSKU.Ubuntu,
        availabilityZones: ["1", "2", "3"],
        enableNodePublicIP: false,
      },
    ],
  },
  {
    dependsOn: [
      ipRoleAssignmentControl,
      ipRoleAssignmentKubelet,
      commonAcrRoleAssignment,
      managedIdentityOperatorRoleAssignment,
    ],
    ignoreChanges: [
      // see warning comment above
      "agentPoolProfiles",
      "networkProfile",
    ],
  }
)
