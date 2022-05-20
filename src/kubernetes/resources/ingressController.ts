import * as pulumi from "@pulumi/pulumi"
import * as k8s from "@pulumi/kubernetes"

import { publicIngressIpAddress, resourceGroup } from "../../azure/aks"
import { clusterProvider } from "../clusterProvider"

export const namespace = new k8s.core.v1.Namespace(
  "ingress-controller-namespace",
  {
    metadata: {
      name: "ingress-nginx",
      annotations: {
        // This annotation is needed to provision let's encrypt certs
        "cert-manager.io/disable-validation": "true",
      },
    },
  },
  {
    provider: clusterProvider,
  }
)

// Deploy the nginx ingress controller to AKS
const nginxIngress = pulumi
  .all([publicIngressIpAddress.ipAddress, publicIngressIpAddress.dnsSettings])
  .apply(([ipAddress, dnsSettings]) => {
    if (!ipAddress) {
      throw new Error("IP address isn't yet known, run again to see if the specific IP address is provisioned")
    }

    if (dnsSettings === undefined) {
      throw new Error("dnsSettings on the publicIngressIpAddress is undefined.")
    }

    return new k8s.helm.v3.Release(
      "ingress-nginx-chart",
      {
        chart: "ingress-nginx",
        name: "ingress-nginx",
        version: "4.0.16",
        repositoryOpts: {
          repo: "https://kubernetes.github.io/ingress-nginx",
        },
        namespace: namespace.metadata.name,
        createNamespace: false,
        // https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
        values: {
          controller: {
            replicaCount: 2,
            service: {
              annotations: {
                "service.beta.kubernetes.io/azure-load-balancer-resource-group": resourceGroup.name,
                // "service.beta.kubernetes.io/azure-dns-label-name": dnsSettings.domainNameLabel,
              },
              loadBalancerIP: ipAddress,
            },
            config: {
              // Customize ConfigMap configuration for Nginx
              // https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/#configuration-options
              // Configure ingress to support compressing with brotli
              "enable-brotli": "true",
              "brotli-level": "6",
              // Configure ingress to support compressing with gzip
              "enable-gzip": "true",
            },
          },
        },
      },
      {
        provider: clusterProvider,
      }
    )
  })
