import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Template } from 'aws-cdk-lib/assertions';
import { OutputsConstruct } from '../../lib/constructs/outputs/outputs-construct';

describe('Outputs Construct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let alb: elbv2.ApplicationLoadBalancer;
  let asg: autoscaling.AutoScalingGroup;
  let database: rds.DatabaseInstance;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc');
    
    alb = new elbv2.ApplicationLoadBalancer(stack, 'TestAlb', {
      vpc,
      internetFacing: true,
    });

    asg = new autoscaling.AutoScalingGroup(stack, 'TestAsg', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    });

    database = new rds.DatabaseInstance(stack, 'TestDb', {
      engine: rds.DatabaseInstanceEngine.mariaDb({
        version: rds.MariaDbEngineVersion.VER_10_11,
      }),
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    });
  });

  test('creates CloudFormation outputs', () => {
    new OutputsConstruct(stack, 'TestOutputs', {
      vpc,
      loadBalancer: alb,
      autoScalingGroup: asg,
      database,
      environment: 'test',
    });

    const template = Template.fromStack(stack);
    const outputs = template.toJSON().Outputs;
    
    expect(outputs).toBeDefined();
    
    // Check that key outputs exist by searching for their descriptions
    const outputKeys = Object.keys(outputs);
    expect(outputKeys.some(key => outputs[key].Description === 'VPC ID')).toBe(true);
    expect(outputKeys.some(key => outputs[key].Description?.includes('Load Balancer DNS'))).toBe(true);
    expect(outputKeys.some(key => outputs[key].Description === 'Auto Scaling Group Name')).toBe(true);
    expect(outputKeys.some(key => outputs[key].Description?.includes('Database Endpoint'))).toBe(true);
  });

  test('exports VPC information', () => {
    new OutputsConstruct(stack, 'TestOutputs', {
      vpc,
      loadBalancer: alb,
      autoScalingGroup: asg,
      database,
      environment: 'test',
    });

    const template = Template.fromStack(stack);
    const outputs = template.toJSON().Outputs;
    
    // Find VPC outputs by description and verify export names
    const outputKeys = Object.keys(outputs);
    const vpcIdOutput = outputKeys.find(key => outputs[key].Description === 'VPC ID');
    const vpcCidrOutput = outputKeys.find(key => outputs[key].Description === 'VPC CIDR Block');
    
    expect(vpcIdOutput).toBeDefined();
    expect(vpcCidrOutput).toBeDefined();
    expect(outputs[vpcIdOutput!].Export.Name).toBe('test-HighlyAvailable2Tier-VpcId');
    expect(outputs[vpcCidrOutput!].Export.Name).toBe('test-HighlyAvailable2Tier-VpcCidr');
  });

  test('exports load balancer DNS', () => {
    new OutputsConstruct(stack, 'TestOutputs', {
      vpc,
      loadBalancer: alb,
      autoScalingGroup: asg,
      database,
      environment: 'prod',
    });

    const template = Template.fromStack(stack);
    const outputs = template.toJSON().Outputs;
    
    // Find load balancer outputs by description
    const outputKeys = Object.keys(outputs);
    const applicationUrlOutput = outputKeys.find(key => outputs[key].Description === 'Full Application URL');
    const loadBalancerDnsOutput = outputKeys.find(key => outputs[key].Description?.includes('Load Balancer DNS'));
    
    expect(applicationUrlOutput).toBeDefined();
    expect(loadBalancerDnsOutput).toBeDefined();
    expect(outputs[loadBalancerDnsOutput!].Export.Name).toBe('prod-HighlyAvailable2Tier-LoadBalancerDNS');
  });
});
