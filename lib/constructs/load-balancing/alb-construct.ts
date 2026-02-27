import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AlbConstructProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  internetFacing: boolean;
  deletionProtection: boolean;
  idleTimeout: number;
  http2Enabled: boolean;
  targetGroupPort: number;
  targetGroupProtocol: string;
  targetType: string;
  listenerPort: number;
  listenerProtocol: string;
  deregistrationDelay: number;
  healthCheck: {
    path: string;
    protocol: string;
    interval: number;
    timeout: number;
    healthyThresholdCount: number;
    unhealthyThresholdCount: number;
    port: string;
  };
  loadBalancerName?: string;
  targetGroupName?: string;
  listenerName?: string;
}

/**
 * Application Load Balancer Construct
 * 
 * Creates an Application Load Balancer with target group and listener
 * 
 * The ALB:
 * - Is internet-facing and deployed in public subnets
 * - Distributes traffic across multiple availability zones
 * - Performs health checks on registered targets
 * - Provides a single DNS endpoint for clients
 */
export class AlbConstruct extends Construct {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly listener: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: AlbConstructProps) {
    super(scope, id);

    // Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, props.loadBalancerName || 'ApplicationLoadBalancer', {
      vpc: props.vpc,
      internetFacing: props.internetFacing,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: props.securityGroup,
      deletionProtection: props.deletionProtection,
      idleTimeout: Duration.seconds(props.idleTimeout),
      http2Enabled: props.http2Enabled,
    });

    // Determine protocol
    const targetProtocol = props.targetGroupProtocol.toUpperCase() === 'HTTPS' 
      ? elbv2.ApplicationProtocol.HTTPS 
      : elbv2.ApplicationProtocol.HTTP;
    
    const listenerProtocol = props.listenerProtocol.toUpperCase() === 'HTTPS'
      ? elbv2.ApplicationProtocol.HTTPS
      : elbv2.ApplicationProtocol.HTTP;
    
    const healthCheckProtocol = props.healthCheck.protocol.toUpperCase() === 'HTTPS'
      ? elbv2.Protocol.HTTPS
      : elbv2.Protocol.HTTP;
    
    const targetType = props.targetType.toUpperCase() === 'IP'
      ? elbv2.TargetType.IP
      : props.targetType.toUpperCase() === 'LAMBDA'
      ? elbv2.TargetType.LAMBDA
      : elbv2.TargetType.INSTANCE;

    // Create Target Group
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, props.targetGroupName || 'WebAppTargetGroup', {
      vpc: props.vpc,
      port: props.targetGroupPort,
      protocol: targetProtocol,
      targetType: targetType,
      healthCheck: {
        enabled: true,
        path: props.healthCheck.path,
        protocol: healthCheckProtocol,
        port: props.healthCheck.port,
        interval: Duration.seconds(props.healthCheck.interval),
        timeout: Duration.seconds(props.healthCheck.timeout),
        healthyThresholdCount: props.healthCheck.healthyThresholdCount,
        unhealthyThresholdCount: props.healthCheck.unhealthyThresholdCount,
      },
      deregistrationDelay: Duration.seconds(props.deregistrationDelay),
    });

    // Create HTTP Listener
    this.listener = this.loadBalancer.addListener(props.listenerName || 'HttpListener', {
      port: props.listenerPort,
      protocol: listenerProtocol,
      defaultTargetGroups: [this.targetGroup],
    });
  }
}
