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

export const resourceGroup = new azure.resources.ResourceGroup("aks-rg", {
  resourceGroupName,
  tags: {
    project: pulumi.getProject(),
    stack: pulumi.getStack(),
  },
})

const controlManagedIdentity = new azure.managedidentity.UserAssignedIdentity("aks-control-plane-managed-identity", {
  resourceGroupName: resourceGroup.name,
  resourceName: `${pulumi.getStack()}-aks-control-identity`,
})

const kubeletManagedIdentity = new azure.managedidentity.UserAssignedIdentity("aks-kubelet-managed-identity", {
  resourceGroupName: resourceGroup.name,
  resourceName: `${pulumi.getStack()}-aks-kubelet-identity`,
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
    ignoreChanges: [
      // see warning comment above
      "agentPoolProfiles",
    ],
    protect: true,
  }
)
