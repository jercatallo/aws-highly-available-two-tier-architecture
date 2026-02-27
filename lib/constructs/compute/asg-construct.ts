import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export interface AsgConstructProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  targetGroup: elbv2.ApplicationTargetGroup;
  minCapacity: number;
  maxCapacity: number;
  desiredCapacity: number;
  instanceClass: ec2.InstanceClass;
  instanceSize: ec2.InstanceSize;
  machineImage: ec2.IMachineImage;
  healthCheckType: string;
  healthCheckGracePeriod: number;
  cooldown: number;
  targetCpuUtilization: number;
  volumeSize: number;
  volumeType: ec2.EbsDeviceVolumeType;
  encrypted: boolean;
  deleteOnTermination: boolean;
  iops: number;
  deviceName: string;
  requireImdsv2?: boolean;
  subnetType?: string;
  autoScalingGroupName?: string;
  cpuScalingPolicyName?: string;
  userDataScriptPath?: string;
}

/**
 * Auto Scaling Group Construct for Web/App Servers
 * 
 * Creates an Auto Scaling Group for web/app servers
 * 
 * The ASG:
 * - Deploys instances across multiple availability zones in private subnets
 * - Automatically scales based on CPU utilization
 * - Maintains desired capacity and handles instance failures
 * - Registers instances with the ALB target group
 * - Enforces IMDSv2 for enhanced security
 */
export class AsgConstruct extends Construct {
  public readonly autoScalingGroup: autoscaling.AutoScalingGroup;

  constructor(scope: Construct, id: string, props: AsgConstructProps) {
    super(scope, id);

    // Determine subnet type
    const subnetType = props.subnetType === 'PUBLIC' 
      ? ec2.SubnetType.PUBLIC
      : props.subnetType === 'PRIVATE_ISOLATED'
      ? ec2.SubnetType.PRIVATE_ISOLATED
      : ec2.SubnetType.PRIVATE_WITH_EGRESS;

    // Create Auto Scaling Group
    this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, props.autoScalingGroupName || 'WebAppAutoScalingGroup', {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(props.instanceClass, props.instanceSize),
      machineImage: props.machineImage,
      securityGroup: props.securityGroup,
      minCapacity: props.minCapacity,
      maxCapacity: props.maxCapacity,
      desiredCapacity: props.desiredCapacity,
      vpcSubnets: { subnetType },
      cooldown: Duration.seconds(props.cooldown),
      requireImdsv2: props.requireImdsv2 ?? true,
      blockDevices: [
        {
          deviceName: props.deviceName,
          volume: autoscaling.BlockDeviceVolume.ebs(props.volumeSize, {
            volumeType: props.volumeType as autoscaling.EbsDeviceVolumeType,
            encrypted: props.encrypted,
            deleteOnTermination: props.deleteOnTermination,
            iops: props.iops,
          }),
        },
      ],
    });

    // User data to install and configure web server
    if (props.userDataScriptPath) {
      const userDataScript = fs.readFileSync(props.userDataScriptPath, 'utf8');
      this.autoScalingGroup.addUserData(userDataScript);
    }

    // Attach Auto Scaling Group to ALB Target Group
    this.autoScalingGroup.attachToApplicationTargetGroup(props.targetGroup);

    // Set health check configuration using CloudFormation override
    const cfnAsg = this.autoScalingGroup.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    cfnAsg.healthCheckGracePeriod = props.healthCheckGracePeriod;
    cfnAsg.healthCheckType = props.healthCheckType;

    // Add CPU-based scaling policy
    this.autoScalingGroup.scaleOnCpuUtilization(props.cpuScalingPolicyName || 'CpuScaling', {
      targetUtilizationPercent: props.targetCpuUtilization,
      cooldown: Duration.seconds(props.cooldown),
    });
  }
}
