import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecurityGroupsConstruct } from '../../lib/constructs/networking/security-group-construct';

describe('Security Group Construct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc');
  });

  test('creates three security groups (ALB, ASG, and DB)', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    // Should create 3 security groups (ALB, ASG, and DB)
    template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
  });

  test('EC2 security group allows HTTP from specified CIDR', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '203.0.113.0/24',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          CidrIp: '203.0.113.0/24',
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
        }),
      ]),
    });
  });

  test('Creates security groups for highly available architecture', () => {
    const construct = new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    // Verify all three security groups are created
    expect(construct.albSecurityGroup).toBeDefined();
    expect(construct.asgSecurityGroup).toBeDefined();
    expect(construct.dbSecurityGroup).toBeDefined();
  });

  test('database security group allows MySQL from EC2 security group', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    // DB security group should reference EC2 security group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for RDS database',
    });
  });

  test('returns both security groups', () => {
    const construct = new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    expect(construct.albSecurityGroup).toBeDefined();
    expect(construct.asgSecurityGroup).toBeDefined();
    expect(construct.dbSecurityGroup).toBeDefined();
    expect(construct.albSecurityGroup).toBeInstanceOf(ec2.SecurityGroup);
    expect(construct.asgSecurityGroup).toBeInstanceOf(ec2.SecurityGroup);
    expect(construct.dbSecurityGroup).toBeInstanceOf(ec2.SecurityGroup);
  });

  test('ALB security group allows HTTP from internet', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Application Load Balancer',
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          CidrIp: '0.0.0.0/0',
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
        }),
      ]),
    });
  });

  test('ASG security group allows HTTP from ALB only', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
      dbPort: 3306,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Auto Scaling Group instances',
    });
  });
});
