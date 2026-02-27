import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkAclConstructProps {
  vpc: ec2.Vpc;
  vpcCidr: string;
  httpPort: number;
  httpsPort: number;
  dbPort: number;
  httpInboundRuleNumber?: number;
  enableHttpInbound?: boolean;
  httpsInboundRuleNumber?: number;
  enableHttpsInbound?: boolean;
  ephemeralInboundRuleNumber?: number;
  enableEphemeralInbound?: boolean;
  allOutboundRuleNumber?: number;
  enableAllOutbound?: boolean;
  privateHttpRuleNumber?: number;
  enablePrivateHttpInbound?: boolean;
  privateDatabaseRuleNumber?: number;
  enablePrivateDatabaseInbound?: boolean;
  privateEphemeralRuleNumber?: number;
  enablePrivateEphemeralInbound?: boolean;
  enablePrivateAllOutbound?: boolean;
  ephemeralPortStart?: number;
  ephemeralPortEnd?: number;
  publicNetworkAclName?: string;
  privateNetworkAclName?: string;
}

/**
 * Network ACL Construct for Subnet-Level Security
 * 
 * Creates custom Network ACLs for public and private subnets
 * 
 * Network ACLs provide subnet-level stateless firewall rules.
 * They act as a second layer of defense after Security Groups.
 * 
 * Public subnet rules:
 * - Allow HTTP inbound
 * - Allow ephemeral ports for return traffic
 * 
 * Private subnet rules:
 * - Allow database traffic from VPC CIDR only
 * - Allow HTTP/HTTPS for updates
 * - Deny all other inbound traffic
 */
export class NetworkAclConstruct extends Construct {
  public readonly publicNetworkAcl: ec2.NetworkAcl;
  public readonly privateNetworkAcl: ec2.NetworkAcl;

  constructor(scope: Construct, id: string, props: NetworkAclConstructProps) {
    super(scope, id);

    // Network ACL for Public Subnets
    this.publicNetworkAcl = new ec2.NetworkAcl(this, props.publicNetworkAclName || 'PublicNetworkAcl', {
      vpc: props.vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Allow HTTP inbound (rule 100)
    if (props.enableHttpInbound ?? true) {
      this.publicNetworkAcl.addEntry('AllowHttpInbound', {
        cidr: ec2.AclCidr.anyIpv4(),
        ruleNumber: props.httpInboundRuleNumber ?? 100,
        traffic: ec2.AclTraffic.tcpPort(props.httpPort),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });
    }

    // Allow HTTPS inbound (rule 105)
    if (props.enableHttpsInbound ?? true) {
      this.publicNetworkAcl.addEntry('AllowHttpsInbound', {
        cidr: ec2.AclCidr.anyIpv4(),
        ruleNumber: props.httpsInboundRuleNumber ?? 105,
        traffic: ec2.AclTraffic.tcpPort(props.httpsPort),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });
    }

    // Allow ephemeral ports for return traffic (rule 110)
    if (props.enableEphemeralInbound ?? true) {
      this.publicNetworkAcl.addEntry('AllowEphemeralInbound', {
        cidr: ec2.AclCidr.anyIpv4(),
        ruleNumber: props.ephemeralInboundRuleNumber ?? 110,
        traffic: ec2.AclTraffic.tcpPortRange(
          props.ephemeralPortStart ?? 1024, 
          props.ephemeralPortEnd ?? 65535
        ),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });
    }

    // Allow all outbound traffic (rule 100)
    if (props.enableAllOutbound ?? true) {
      this.publicNetworkAcl.addEntry('AllowAllOutbound', {
        cidr: ec2.AclCidr.anyIpv4(),
        ruleNumber: props.allOutboundRuleNumber ?? 100,
        traffic: ec2.AclTraffic.allTraffic(),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
      });
    }

    // Network ACL for Private Subnets
    this.privateNetworkAcl = new ec2.NetworkAcl(this, props.privateNetworkAclName || 'PrivateNetworkAcl', {
      vpc: props.vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Allow HTTP from VPC CIDR (rule 100)
    if (props.enablePrivateHttpInbound ?? true) {
      this.privateNetworkAcl.addEntry('AllowHttpFromVpc', {
        cidr: ec2.AclCidr.ipv4(props.vpcCidr),
        ruleNumber: props.privateHttpRuleNumber ?? 100,
        traffic: ec2.AclTraffic.tcpPort(props.httpPort),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });
    }

    // Allow database traffic from VPC CIDR (rule 110)
    if (props.enablePrivateDatabaseInbound ?? true) {
      this.privateNetworkAcl.addEntry('AllowDatabaseFromVpc', {
        cidr: ec2.AclCidr.ipv4(props.vpcCidr),
        ruleNumber: props.privateDatabaseRuleNumber ?? 110,
        traffic: ec2.AclTraffic.tcpPort(props.dbPort),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });
    }

    // Allow ephemeral ports for return traffic (rule 120)
    if (props.enablePrivateEphemeralInbound ?? true) {
      this.privateNetworkAcl.addEntry('AllowEphemeralInboundPrivate', {
        cidr: ec2.AclCidr.anyIpv4(),
        ruleNumber: props.privateEphemeralRuleNumber ?? 120,
        traffic: ec2.AclTraffic.tcpPortRange(
          props.ephemeralPortStart ?? 1024, 
          props.ephemeralPortEnd ?? 65535
        ),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });
    }

    // Allow all outbound traffic (rule 100)
    if (props.enablePrivateAllOutbound ?? true) {
      this.privateNetworkAcl.addEntry('AllowAllOutboundPrivate', {
        cidr: ec2.AclCidr.anyIpv4(),
        ruleNumber: props.allOutboundRuleNumber ?? 100,
        traffic: ec2.AclTraffic.allTraffic(),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
      });
    }
  }
}
