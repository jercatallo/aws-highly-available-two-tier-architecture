import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface VpcConstructProps {
  cidr: string;
  maxAzs: number;
  natGatewaysCount: number;
  subnetCidrMask: number;
  enableFlowLogs?: boolean;
  flowLogsRetentionDays?: number;
  publicSubnetName?: string;
  privateSubnetName?: string;
  flowLogsTrafficType?: string;
  flowLogsRemovalPolicy?: string;
  vpcName?: string;
  flowLogsGroupName?: string;
  flowLogName?: string;
}

/**
 * VPC Construct for Highly Available Architecture
 * 
 * Creates a VPC with public and private subnets across multiple availability zones
 * 
 * Auto-created resources:
 * - VPC with specified CIDR block
 * - Public Subnets (one per AZ)
 * - Private Subnets (one per AZ) 
 * - Internet Gateway (IGW) for public internet access
 * - NAT Gateways (one per AZ) for private subnet outbound internet
 * - Route Tables with appropriate routes
 * - VPC Flow Logs (optional)
 */
export class VpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, props.vpcName || 'HighlyAvailableVpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: props.maxAzs,
      natGateways: props.natGatewaysCount,
      subnetConfiguration: [
        {
          name: props.publicSubnetName || 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: props.subnetCidrMask,
        },
        {
          name: props.privateSubnetName || 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: props.subnetCidrMask,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: props.subnetCidrMask,
        },
      ],
    });

    // Enable VPC Flow Logs for network monitoring
    if (props.enableFlowLogs) {
      const removalPolicy = props.flowLogsRemovalPolicy === 'RETAIN' 
        ? RemovalPolicy.RETAIN 
        : RemovalPolicy.DESTROY;
      
      const logGroup = new logs.LogGroup(this, props.flowLogsGroupName || 'VpcFlowLogsGroup', {
        retention: props.flowLogsRetentionDays || logs.RetentionDays.ONE_WEEK,
        removalPolicy,
      });

      const trafficType = props.flowLogsTrafficType === 'ACCEPT' 
        ? ec2.FlowLogTrafficType.ACCEPT
        : props.flowLogsTrafficType === 'REJECT'
        ? ec2.FlowLogTrafficType.REJECT
        : ec2.FlowLogTrafficType.ALL;

      this.vpc.addFlowLog(props.flowLogName || 'VpcFlowLog', {
        destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup),
        trafficType,
      });
    }
  }
}
