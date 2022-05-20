import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure-native"

import { domainName } from "../.imports/config"
import { publicIngressIpAddress } from "./aks"

const resourceGroupName = `${pulumi.getStack()}-dns-rg`
export const resourceGroup = new azure.resources.ResourceGroup("dns-rg", {
  resourceGroupName,
})

export const dnsZone = new azure.network.Zone(`domain-${domainName}-zone`, {
  resourceGroupName: resourceGroup.name,
  zoneName: domainName,
  zoneType: azure.network.ZoneType.Public,
  location: "Global",
})

// Add records to point all traffic to the cluster's loadbalancer
new azure.network.RecordSet(`domain-${domainName}-lb-record`, {
  aRecords: [
    {
      ipv4Address: publicIngressIpAddress.ipAddress,
    },
  ],
  recordType: "A",
  relativeRecordSetName: "@", // leave empty to refer to the Apex domain
  resourceGroupName: resourceGroup.name,
  ttl: 300,
  zoneName: dnsZone.name,
})

new azure.network.RecordSet(`domain-${domainName}-wildcard-lb-record`, {
  aRecords: [
    {
      ipv4Address: publicIngressIpAddress.ipAddress,
    },
  ],
  recordType: "A",
  relativeRecordSetName: `*`, // use wildard to forward all subdomains to the LB
  resourceGroupName: resourceGroup.name,
  ttl: 300,
  zoneName: dnsZone.name,
})
