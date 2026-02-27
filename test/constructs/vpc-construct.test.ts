import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { VpcConstruct } from '../../lib/constructs/networking/vpc-construct';

describe('VPC Construct', () => {
  let stack: cdk.Stack;

  beforeEach(() => {
    const app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  test('creates VPC with correct CIDR block', () => {
    new VpcConstruct(stack, 'TestVpc', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGatewaysCount: 2,
      subnetCidrMask: 24,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
    });
  });

  test('creates public and private subnets', () => {
    new VpcConstruct(stack, 'TestVpc', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGatewaysCount: 2,
      subnetCidrMask: 24,
    });

    const template = Template.fromStack(stack);
    
    // Should have 2 public + 2 private + 2 isolated subnets (one of each per AZ)
    template.resourceCountIs('AWS::EC2::Subnet', 6); // 2 public + 2 private + 2 isolated
  });

  test('creates NAT Gateways when count is greater than 0', () => {
    new VpcConstruct(stack, 'TestVpc', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGatewaysCount: 2,
      subnetCidrMask: 24,
    });

    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::EC2::NatGateway', 2);
  });

  test('creates Internet Gateway', () => {
    new VpcConstruct(stack, 'TestVpc', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGatewaysCount: 2,
      subnetCidrMask: 24,
    });

    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);
  });

  test('works with different CIDR blocks', () => {
    new VpcConstruct(stack, 'TestVpc', {
      cidr: '172.16.0.0/16',
      maxAzs: 2,
      natGatewaysCount: 1,
      subnetCidrMask: 24,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '172.16.0.0/16',
    });
  });
});
