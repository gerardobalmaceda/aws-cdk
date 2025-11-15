import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Propiedades para el construct WebServerSecurityGroup
 */
export interface WebServerSecurityGroupProps {
  /**
   * VPC donde se creará el Security Group
   */
  readonly vpc: ec2.IVpc;

  /**
   * Descripción del Security Group
   * @default 'Security Group para servidor web'
   */
  readonly description?: string;

  /**
   * Permitir todo el tráfico saliente
   * @default true
   */
  readonly allowAllOutbound?: boolean;

  /**
   * Permitir tráfico SSH (puerto 22)
   * @default true
   */
  readonly allowSsh?: boolean;

  /**
   * Permitir tráfico HTTP (puerto 80)
   * @default true
   */
  readonly allowHttp?: boolean;

  /**
   * Permitir tráfico HTTPS (puerto 443)
   * @default false
   */
  readonly allowHttps?: boolean;
}

/**
 * Construct L3 que encapsula la configuración de un Security Group
 * para servidores web con reglas comunes pre-configuradas
 *
 * Este construct facilita la creación de Security Groups con las reglas
 * más comunes para servidores web (SSH, HTTP, HTTPS)
 *
 * @example
 * ```typescript
 * const securityGroup = new WebServerSecurityGroup(this, 'WebSG', {
 *   vpc: myVpc,
 *   allowSsh: true,
 *   allowHttp: true,
 *   allowHttps: true,
 * });
 * ```
 */
export class WebServerSecurityGroup extends Construct {
  /**
   * El Security Group creado por este construct
   */
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    props: WebServerSecurityGroupProps
  ) {
    super(scope, id);

    // Crear el Security Group base (Construct L2 de CDK)
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: props.description ?? 'Security Group para servidor web',
      allowAllOutbound: props.allowAllOutbound ?? true,
    });

    // Agregar regla de ingreso SSH si está habilitada
    if (props.allowSsh ?? true) {
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(22),
        'Allow SSH access'
      );
    }

    // Agregar regla de ingreso HTTP si está habilitada
    if (props.allowHttp ?? true) {
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80),
        'Allow HTTP traffic'
      );
    }
  }

  /**
   * Agregar una regla de ingreso personalizada al Security Group
   *
   * @param peer - Origen del tráfico
   * @param port - Puerto de destino
   * @param description - Descripción de la regla
   */
  public addIngressRule(
    peer: ec2.IPeer,
    port: ec2.Port,
    description?: string
  ): void {
    this.securityGroup.addIngressRule(peer, port, description);
  }
}
