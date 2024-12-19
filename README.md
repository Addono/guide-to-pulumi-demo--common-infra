# Guide to Pulumi - Common Infrastructure

This repository is part of the Guide to Pulumi project, which showcases how to set up scalable infrastructure using Pulumi. This project consists of this repository and the [frontend application repository](https://github.com/Addono/guide-to-pulumi-demo--frontend-app). The latter deploys an application onto the infrastructure deployed in this repository.

## Resources Deployed

### AKS Cluster

The Azure Kubernetes Service (AKS) cluster is deployed to provide a scalable and managed Kubernetes environment. It includes the following components:
- AKS cluster
- Public IP address for ingress
- Managed identities for control plane and kubelet
- Role assignments for network and ACR access

### Container Registry

The Azure Container Registry (ACR) is deployed to store and manage container images. It includes the following components:
- Container registry
- Resource group for the registry

### DNS Zone

The DNS zone is deployed to manage DNS records for the domain. It includes the following components:
- DNS zone
- A records for the domain and wildcard subdomains

### Kubernetes Configurations

The Kubernetes configurations are deployed to manage the Kubernetes resources within the AKS cluster. It includes the following components:
- Ingress controller namespace
- Nginx ingress controller

## Getting Started

To get started with this repository, follow these steps:

1. Clone the repository:
   ```sh
   git clone https://github.com/Addono/guide-to-pulumi-demo--common-infra.git
   cd guide-to-pulumi-demo--common-infra
   ```

2. Install the dependencies:
   ```sh
   npm install
   ```

3. Configure Pulumi:
   ```sh
   pulumi config set azure-native:location <your-azure-location>
   pulumi config set azure-native:subscriptionId <your-azure-subscription-id>
   pulumi config set azure-native:tenantId <your-azure-tenant-id>
   pulumi config set guide-to-pulumi--common-infra:domainName <your-domain-name>
   ```

4. Deploy the infrastructure:
   ```sh
   pulumi up
   ```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
