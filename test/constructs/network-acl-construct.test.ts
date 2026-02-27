import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { NetworkAclConstruct } from '../../lib/constructs/networking/network-acl-construct';

describe('Network ACL Construct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc');
  });

  test('creates public and private network ACLs', () => {
    const naclConstruct = new NetworkAclConstruct(stack, 'TestNacl', {
      vpc,
      vpcCidr: '10.0.0.0/16',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::EC2::NetworkAcl', 2);
    expect(naclConstruct.publicNetworkAcl).toBeDefined();
    expect(naclConstruct.privateNetworkAcl).toBeDefined();
  });

  test('public NACL allows HTTP traffic', () => {
    new NetworkAclConstruct(stack, 'TestNacl', {
      vpc,
      vpcCidr: '10.0.0.0/16',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
      RuleNumber: 100,
      Protocol: 6, // TCP
      PortRange: { From: 80, To: 80 },
      Egress: false,
      RuleAction: 'allow',
    });
  });

  test('public NACL allows HTTPS traffic', () => {
    new NetworkAclConstruct(stack, 'TestNacl', {
      vpc,
      vpcCidr: '10.0.0.0/16',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
      RuleNumber: 105,
      Protocol: 6, // TCP
      PortRange: { From: 443, To: 443 },
      Egress: false,
      RuleAction: 'allow',
    });
  });

  test('private NACL allows database traffic from VPC', () => {
    new NetworkAclConstruct(stack, 'TestNacl', {
      vpc,
      vpcCidr: '10.0.0.0/16',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
      RuleNumber: 110,
      Protocol: 6, // TCP
      PortRange: { From: 3306, To: 3306 },
      CidrBlock: '10.0.0.0/16',
      Egress: false,
      RuleAction: 'allow',
    });
  });

  test('does not create HTTPS rule when disabled', () => {
    new NetworkAclConstruct(stack, 'TestNacl', {
      vpc,
      vpcCidr: '10.0.0.0/16',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
      enableHttpsInbound: false,
    });

    const template = Template.fromStack(stack);
    
    // Should NOT find the HTTPS rule (105)
    const rules = template.findResources('AWS::EC2::NetworkAclEntry', {
      Properties: {
        RuleNumber: 105,
        Protocol: 6,
        PortRange: { From: 443, To: 443 },
        Egress: false,
        RuleAction: 'allow',
      }
    });
    
    expect(Object.keys(rules).length).toBe(0);
  });
});
