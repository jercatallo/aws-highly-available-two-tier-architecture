import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Template } from 'aws-cdk-lib/assertions';
import { AsgConstruct } from '../../lib/constructs/compute/asg-construct';

describe('ASG Construct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let securityGroup: ec2.SecurityGroup;
  let targetGroup: elbv2.ApplicationTargetGroup;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc');
    securityGroup = new ec2.SecurityGroup(stack, 'TestSG', { vpc });
    targetGroup = new elbv2.ApplicationTargetGroup(stack, 'TestTG', {
      vpc,
      port: 80,
      targetType: elbv2.TargetType.INSTANCE,
    });
  });

  test('creates Auto Scaling Group', () => {
    const asgConstruct = new AsgConstruct(stack, 'TestAsg', {
      vpc,
      securityGroup,
      targetGroup,
      minCapacity: 2,
      maxCapacity: 6,
      desiredCapacity: 2,
      instanceClass: ec2.InstanceClass.T2,
      instanceSize: ec2.InstanceSize.MICRO,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      healthCheckType: 'ELB',
      healthCheckGracePeriod: 300,
      cooldown: 300,
      targetCpuUtilization: 70,
      volumeSize: 20,
      volumeType: ec2.EbsDeviceVolumeType.GP3,
      encrypted: true,
      deleteOnTermination: true,
      iops: 3000,
      deviceName: '/dev/xvda',
      requireImdsv2: true,
    });

    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::AutoScaling::AutoScalingGroup', 1);
    expect(asgConstruct.autoScalingGroup).toBeDefined();
  });

  test('enforces IMDSv2', () => {
    new AsgConstruct(stack, 'TestAsg', {
      vpc,
      securityGroup,
      targetGroup,
      minCapacity: 2,
      maxCapacity: 6,
      desiredCapacity: 2,
      instanceClass: ec2.InstanceClass.T2,
      instanceSize: ec2.InstanceSize.MICRO,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      healthCheckType: 'ELB',
      healthCheckGracePeriod: 300,
      cooldown: 300,
      targetCpuUtilization: 70,
      volumeSize: 20,
      volumeType: ec2.EbsDeviceVolumeType.GP3,
      encrypted: true,
      deleteOnTermination: true,
      iops: 3000,
      deviceName: '/dev/xvda',
      requireImdsv2: true,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
      MetadataOptions: {
        HttpTokens: 'required',
      },
    });
  });
});
