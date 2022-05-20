import * as k8s from "@pulumi/kubernetes"
import * as azure from "@pulumi/azure-native"

import { cluster, resourceGroup } from "../azure/aks"

// get cluster credentials
const creds = azure.containerservice.listManagedClusterUserCredentialsOutput({
  resourceGroupName: resourceGroup.name,
  resourceName: cluster.name,
})

const kubeconfig = creds.apply((creds) => Buffer.from(creds.kubeconfigs[0].value, "base64").toString("ascii"))

export const clusterProvider = new k8s.Provider("aks-provider", {
  kubeconfig,
})
