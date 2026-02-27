import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { AlbConstruct } from '../../lib/constructs/load-balancing/alb-construct';

describe('ALB Construct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let securityGroup: ec2.SecurityGroup;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc');
    securityGroup = new ec2.SecurityGroup(stack, 'TestSG', { vpc });
  });

  test('creates Application Load Balancer', () => {
    const albConstruct = new AlbConstruct(stack, 'TestAlb', {
      vpc,
      securityGroup,
      internetFacing: true,
      deletionProtection: false,
      idleTimeout: 60,
      http2Enabled: true,
      targetGroupPort: 80,
      targetGroupProtocol: 'HTTP',
      targetType: 'INSTANCE',
      listenerPort: 80,
      listenerProtocol: 'HTTP',
      deregistrationDelay: 30,
      healthCheck: {
        path: '/',
        protocol: 'HTTP',
        interval: 30,
        timeout: 5,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        port: '80',
      },
    });

    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    expect(albConstruct.loadBalancer).toBeDefined();
    expect(albConstruct.targetGroup).toBeDefined();
    expect(albConstruct.listener).toBeDefined();
  });

  test('creates target group with health check', () => {
    new AlbConstruct(stack, 'TestAlb', {
      vpc,
      securityGroup,
      internetFacing: true,
      deletionProtection: false,
      idleTimeout: 60,
      http2Enabled: true,
      targetGroupPort: 80,
      targetGroupProtocol: 'HTTP',
      targetType: 'INSTANCE',
      listenerPort: 80,
      listenerProtocol: 'HTTP',
      deregistrationDelay: 30,
      healthCheck: {
        path: '/health',
        protocol: 'HTTP',
        interval: 30,
        timeout: 5,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        port: '80',
      },
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      HealthCheckPath: '/health',
      HealthCheckIntervalSeconds: 30,
    });
  });

  test('creates HTTP listener on port 80', () => {
    new AlbConstruct(stack, 'TestAlb', {
      vpc,
      securityGroup,
      internetFacing: true,
      deletionProtection: false,
      idleTimeout: 60,
      http2Enabled: true,
      targetGroupPort: 80,
      targetGroupProtocol: 'HTTP',
      targetType: 'INSTANCE',
      listenerPort: 80,
      listenerProtocol: 'HTTP',
      deregistrationDelay: 30,
      healthCheck: {
        path: '/',
        protocol: 'HTTP',
        interval: 30,
        timeout: 5,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        port: '80',
      },
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 80,
      Protocol: 'HTTP',
    });
  });
});
